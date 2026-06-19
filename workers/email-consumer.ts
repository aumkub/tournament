// Email consumer — processes email queue jobs (legacy fallback)
import { sendRegistrationEmail } from "../lib/registration-email";

interface EmailQueueMessage {
	registrationId: string;
	tournamentId: string;
}

export default {
	async queue(
		batch: MessageBatch<EmailQueueMessage>,
		env: Env,
	): Promise<void> {
		for (const msg of batch.messages) {
			try {
				const { registrationId, tournamentId } = msg.body;

				const reg = await env.DB.prepare(
					"SELECT * FROM registrations WHERE id = ?",
				)
					.bind(registrationId)
					.first();
				if (!reg) {
					msg.ack();
					continue;
				}

				const tournament = await env.DB.prepare(
					"SELECT * FROM tournaments WHERE id = ?",
				)
					.bind(tournamentId)
					.first();
				if (!tournament) {
					msg.ack();
					continue;
				}

				await sendRegistrationEmail(env, tournament, {
					id: reg.id as string,
					type: reg.type as string,
					email: reg.email as string,
					data_json: reg.data_json as string,
				});

				msg.ack();
			} catch (err) {
				console.error("Email queue error:", err);
				msg.retry({ delaySeconds: 60 });
			}
		}
	},
} satisfies ExportedHandler<Env, EmailQueueMessage>;
