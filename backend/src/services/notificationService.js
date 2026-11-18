const prisma = require('../db');

async function notifyUsers(organizationId, userIds, type, title, body, data) {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
  if (!uniqueIds.length) return [];
  return prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({
      organizationId,
      userId,
      type,
      title,
      body: body || null,
      data: data === undefined ? undefined : data,
    })),
    skipDuplicates: true,
  });
}

module.exports = { notifyUsers };
