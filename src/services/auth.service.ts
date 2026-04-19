import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";

export async function registerUser(input: {
  tenantName: string;
  tenantSlug: string;
  email: string;
  password: string;
}) {
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: input.tenantSlug },
  });
  if (existingTenant) {
    throw new Error("Tenant slug already exists");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existingUser) {
    throw new Error("Email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const tenant = await prisma.tenant.create({
    data: {
      name: input.tenantName,
      slug: input.tenantSlug,
      users: {
        create: {
          email: input.email,
          passwordHash,
          role: "owner",
        },
      },
    },
    include: { users: true },
  });

  const user = tenant.users[0];
  const token = jwt.sign(
    { userId: user.id, tenantId: tenant.id, role: user.role },
    env.jwtSecret,
    { expiresIn: "7d" }
  );

  return { tenant, user, token };
}

export async function loginUser(input: {
  email: string;
  password: string;
}) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { tenant: true },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    env.jwtSecret,
    { expiresIn: "7d" }
  );

  return { user, tenant: user.tenant, token };
}
