import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'Latifmuda12@gmail.com' }
    });
    
    if (user) {
      console.log('User found:');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Name:', user.name);
      console.log('Role:', user.role);
      console.log('Password hash:', user.password);
      
      // Update user to admin if not already
      if (user.role !== 'admin') {
        console.log('\nUpdating user to admin...');
        const updatedUser = await prisma.user.update({
          where: { email: 'Latifmuda12@gmail.com' },
          data: { role: 'admin' }
        });
        console.log('User updated to admin!');
      }
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser(); 