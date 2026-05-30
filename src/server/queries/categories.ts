import { asc } from "drizzle-orm";

import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

export async function getCategories() {
  return db.select().from(categories).orderBy(asc(categories.name));
}
