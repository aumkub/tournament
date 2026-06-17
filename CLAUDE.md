# Tournament Project

## Migration Rule

เมื่อสร้างหรือแก้ไขไฟล์ `.sql` ใน `drizzle/` ให้รัน remote migrate ทันทีทุกครั้ง:

```bash
npx wrangler d1 execute tournament-db --remote --file=drizzle/<filename>.sql
```

## Dev Bindings

`wrangler.json` ตั้ง `remote: true` บน D1, R2, KV — `npm run dev` ใช้ Cloudflare resources จริง
DO (TournamentRoom) ยังรัน local แต่เข้าถึง remote DB/KV/R2 ได้
