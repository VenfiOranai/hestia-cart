import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // --- Users ---
  const alice = await prisma.user.create({
    data: { name: "Alice", color: "#4f46e5" }, // indigo
  });
  const bob = await prisma.user.create({
    data: { name: "Bob", color: "#059669" }, // emerald
  });
  const carol = await prisma.user.create({
    data: { name: "Carol", color: "#d97706" }, // amber
  });

  // --- List ---
  const list = await prisma.list.create({
    data: {
      name: "Weekly Groceries",
      shareToken: "clx1abc2def3ghi4jkl5mno", // fake cuid for seed data
      status: "open",
    },
  });

  // --- Members (all three join the list) ---
  await prisma.listMember.createMany({
    data: [
      { userId: alice.id, listId: list.id },
      { userId: bob.id, listId: list.id },
      { userId: carol.id, listId: list.id },
    ],
  });

  // --- Items ---
  const milk = await prisma.item.create({
    data: {
      listId: list.id,
      name: "Milk (1L)",
      cartState: "needed",
      createdByUserId: alice.id,
    },
  });

  const bread = await prisma.item.create({
    data: {
      listId: list.id,
      name: "Sourdough Bread",
      cartState: "inCart",
      createdByUserId: bob.id,
    },
  });

  const almondMilk = await prisma.item.create({
    data: {
      listId: list.id,
      name: "Almond Milk",
      cartState: "needed",
      createdByUserId: carol.id,
    },
  });

  const eggs = await prisma.item.create({
    data: {
      listId: list.id,
      name: "Eggs (12-pack)",
      cartState: "purchased",
      createdByUserId: alice.id,
    },
  });

  // --- ItemExclusions ---
  // Carol is excluded from regular Milk (she's lactose intolerant — she added
  // the Almond Milk instead). This demonstrates the exclusion model: Carol
  // won't split the cost of regular milk.
  await prisma.itemExclusion.create({
    data: { itemId: milk.id, userId: carol.id },
  });

  // Bob is excluded from Almond Milk (he doesn't drink it).
  await prisma.itemExclusion.create({
    data: { itemId: almondMilk.id, userId: bob.id },
  });

  // --- Purchase (eggs already purchased) ---
  const purchase = await prisma.purchase.create({
    data: {
      listId: list.id,
      payerUserId: alice.id,
    },
  });

  await prisma.purchaseItem.create({
    data: {
      purchaseId: purchase.id,
      itemId: eggs.id,
      priceCents: 1290, // ₪12.90 / $12.90
    },
  });

  console.log("Seed complete!");
  console.log(`  Users: ${alice.name}, ${bob.name}, ${carol.name}`);
  console.log(`  List: "${list.name}" (shareToken: ${list.shareToken})`);
  console.log(`  Items: ${milk.name}, ${bread.name}, ${almondMilk.name}, ${eggs.name}`);
  console.log(`  Exclusions: Carol excluded from Milk, Bob excluded from Almond Milk`);
  console.log(`  Purchase: Alice paid for Eggs (${eggs.name}) — 1290 cents`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
