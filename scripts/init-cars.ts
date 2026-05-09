import { drizzle } from "drizzle-orm/mysql2";
import { cars } from "../drizzle/schema";

async function initCars() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  // Note: This script assumes you have at least one family group created
  // You need to replace familyGroupId with an actual ID from your database
  const familyGroupId = 1; // Update this with your actual family group ID

  try {
    // Insert Lexus
    await db.insert(cars).values({
      name: "レクサス",
      familyGroupId,
      color: "ホワイトパール",
      plateNumber: "",
    });

    // Insert Alphard
    await db.insert(cars).values({
      name: "アルファード",
      familyGroupId,
      color: "ブラック",
      plateNumber: "",
    });

    console.log("✓ 車両データを初期化しました (レクサス、アルファード)");
  } catch (error) {
    console.error("車両データの初期化に失敗しました:", error);
    process.exit(1);
  }
}

initCars();
