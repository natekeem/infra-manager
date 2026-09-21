import "server-only";
import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;
export function getMysqlPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT ?? 3306),
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      connectionLimit: 5,
      enableKeepAlive: true,
    });
  }
  return pool;
}
