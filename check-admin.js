const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const u = await p.user.findUnique({ where: { email: 'Hello@operion.online' }, include: { accounts: true } });
  if (!u) { console.log('USER NOT FOUND'); process.exit(1); }
  console.log('email:', u.email);
  console.log('name:', u.name);
  console.log('has passwordHash:', !!u.passwordHash);
  console.log('role:', u.role);
  console.log('isSuperAdmin:', u.isSuperAdmin);
  console.log('oauth accounts:', u.accounts.length);
  await p.$disconnect();
})();
