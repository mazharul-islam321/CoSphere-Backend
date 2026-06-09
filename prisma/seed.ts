/// <reference types="node" />
import 'dotenv/config';
import { PrismaClient, Role, ProjectStatus, TaskPriority, TaskStatus } from '../src/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Clear database
  await prisma.comment.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.activity.deleteMany({});
  // Disconnect users from projects before deleting
  await prisma.project.updateMany({
    data: { creatorId: '' }
  }).catch(() => {});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123', salt);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const pm = await prisma.user.create({
    data: {
      email: 'pm@example.com',
      name: 'PM User',
      passwordHash,
      role: Role.PROJECT_MANAGER,
    },
  });

  const member1 = await prisma.user.create({
    data: {
      email: 'member1@example.com',
      name: 'John Doe',
      passwordHash,
      role: Role.TEAM_MEMBER,
    },
  });

  const member2 = await prisma.user.create({
    data: {
      email: 'member2@example.com',
      name: 'Jane Smith',
      passwordHash,
      role: Role.TEAM_MEMBER,
    },
  });

  const member3 = await prisma.user.create({
    data: {
      email: 'member3@example.com',
      name: 'Bob Johnson',
      passwordHash,
      role: Role.TEAM_MEMBER,
    },
  });

  console.log('Users created:');
  console.log(`- Admin: ${admin.email}`);
  console.log(`- PM: ${pm.email}`);
  console.log(`- Member 1: ${member1.email}`);
  console.log(`- Member 2: ${member2.email}`);
  console.log(`- Member 3: ${member3.email}`);

  // 3. Create projects
  const dateIn = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  const project1 = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Overhaul the main company homepage with a modern, fast, and responsive user experience.',
      deadline: dateIn(15),
      status: ProjectStatus.ACTIVE,
      creatorId: pm.id,
      members: {
        connect: [{ id: member1.id }, { id: member2.id }],
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App Development',
      description: 'Build a companion mobile application for iOS and Android platforms.',
      deadline: dateIn(45),
      status: ProjectStatus.ACTIVE,
      creatorId: pm.id,
      members: {
        connect: [{ id: member2.id }, { id: member3.id }],
      },
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Security Audit',
      description: 'Run penetration testing and fix critical authentication vulnerabilities.',
      deadline: dateIn(2), // Deadline in 2 days
      status: ProjectStatus.ACTIVE,
      creatorId: admin.id,
      members: {
        connect: [{ id: member1.id }],
      },
    },
  });

  console.log('Projects created.');

  // 4. Create tasks
  // Website Redesign tasks
  await prisma.task.create({
    data: {
      title: 'Design Homepage Mockups',
      description: 'Create Figma layouts for desktop, tablet, and mobile views.',
      dueDate: dateIn(3),
      priority: TaskPriority.HIGH,
      status: TaskStatus.COMPLETED,
      projectId: project1.id,
      assignedMemberId: member2.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Setup Frontend Boilerplate',
      description: 'Initialize Next.js application with base routing and configuration.',
      dueDate: dateIn(7),
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      projectId: project1.id,
      assignedMemberId: member1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Create API Documentation',
      description: 'Document endpoints, payload shapes, and expected response codes.',
      dueDate: dateIn(12),
      priority: TaskPriority.LOW,
      status: TaskStatus.IN_PROGRESS,
      projectId: project1.id,
      assignedMemberId: member1.id,
    },
  });

  // Mobile App tasks
  await prisma.task.create({
    data: {
      title: 'Setup Flutter Project',
      description: 'Create workspace and configure Android Studio and Xcode setups.',
      dueDate: dateIn(10),
      priority: TaskPriority.HIGH,
      status: TaskStatus.TODO,
      projectId: project2.id,
      assignedMemberId: member2.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Integrate Authentication',
      description: 'Connect login and signup flows to the backend JWT API.',
      dueDate: dateIn(20),
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      projectId: project2.id,
      assignedMemberId: member3.id,
    },
  });

  // Security Audit tasks
  await prisma.task.create({
    data: {
      title: 'Penetration Testing',
      description: 'Perform SQL injection and XSS vulnerability testing.',
      dueDate: dateIn(1),
      priority: TaskPriority.HIGH,
      status: TaskStatus.TODO,
      projectId: project3.id,
      assignedMemberId: member1.id,
    },
  });

  console.log('Tasks created.');

  // 5. Create activities
  const now = new Date();
  const timeMinus = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000);

  await prisma.activity.createMany({
    data: [
      { description: 'Project "Website Redesign" created', timestamp: timeMinus(120) },
      { description: 'Project "Mobile App Development" created', timestamp: timeMinus(110) },
      { description: 'Project "Security Audit" created', timestamp: timeMinus(105) },
      { description: 'Member John Doe added to "Website Redesign"', timestamp: timeMinus(90) },
      { description: 'Member Jane Smith added to "Website Redesign"', timestamp: timeMinus(85) },
      { description: 'Task "Design Homepage Mockups" assigned to Jane Smith', timestamp: timeMinus(80) },
      { description: 'Task "Design Homepage Mockups" marked as Completed', timestamp: timeMinus(30) },
      { description: 'Task "Setup Frontend Boilerplate" assigned to John Doe', timestamp: timeMinus(15) },
    ],
  });

  console.log('Activities seeded.');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
