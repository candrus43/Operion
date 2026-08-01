const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const pw = await hash('Admin123!', 12);
  const u = await p.user.update({ where: { email: 'Hello@operion.online' }, data: { passwordHash: pw } });
  console.log('OK:', u.email);
  await p.$disconnect();
})();
