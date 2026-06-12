# Tournament Project

## Migration Rule

เมื่อสร้างหรือแก้ไขไฟล์ `.sql` ใน `drizzle/` ให้รัน local migrate ทันทีทุกครั้ง:

```bash
npx wrangler d1 execute tournament-db --local --file=drizzle/<filename>.sql
```
