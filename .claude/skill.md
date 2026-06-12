# Project Skills

## Database Migrations

ทุกครั้งที่มีการเพิ่มหรือแก้ไขไฟล์ `.sql` ใน `drizzle/` ให้รัน migrate local ทันที:

```bash
npx wrangler d1 execute tournament-db --local --file=drizzle/<filename>.sql
```

หรือถ้าต้องการรันทุกไฟล์:
```bash
for f in drizzle/*.sql; do npx wrangler d1 execute tournament-db --local --file="$f"; done
```
