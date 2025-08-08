const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');
const notificationService = require('../services/notificationService');

/**
 * Seed script for the Farm-to-Market Platform
 * This script populates the database with initial data for development/testing
 */

class DatabaseSeeder {
  constructor() {
    this.users = [];
    this.products = [];
    this.orders = [];
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  async seedUsers() {
    console.log('🌱 Seeding users...');
    
    const usersData = [
      {
        email: 'admin@farmmarket.com',
        password: 'admin123',
        full_name: 'System Administrator',
        phone: '+1234567890',
        role: 'admin',
        address: 'Admin Office, City Center',
        is_verified: true,
        is_active: true
      },
      {
        email: 'farmer1@example.com',
        password: 'farmer123',
        full_name: 'John Smith',
        phone: '+1234567891',
        role: 'farmer',
        address: '123 Farm Road, Rural Valley',
        is_verified: true,
        is_active: true
      },
      {
        email: 'farmer2@example.com',
        password: 'farmer123',
        full_name: 'Maria Garcia',
        phone: '+1234567892',
        role: 'farmer',
        address: '456 Green Acres, Countryside',
        is_verified: true,
        is_active: true
      },
      {
        email: 'retailer1@example.com',
        password: 'retailer123',
        full_name: 'David Johnson',
        phone: '+1234567893',
        role: 'retailer',
        address: '789 Market Street, Downtown',
        is_verified: true,
        is_active: true
      },
      {
        email: 'retailer2@example.com',
        password: 'retailer123',
        full_name: 'Sarah Wilson',
        phone: '+1234567894',
        role: 'retailer',
        address: '321 Commerce Ave, Business District',
        is_verified: true,
        is_active: true
      },
      {
        email: 'unverified@example.com',
        password: 'test123',
        full_name: 'Test User',
        phone: '+1234567895',
        role: 'retailer',
        address: '999 Test Street, Test City',
        is_verified: false,
        is_active: true
      }
    ];

    for (const userData of usersData) {
      const hashedPassword = await this.hashPassword(userData.password);
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          password_hash: hashedPassword,
          full_name: userData.full_name,
          phone: userData.phone,
          role: userData.role,
          address: userData.address,
          is_verified: userData.is_verified,
          is_active: userData.is_active
        })
        .select()
        .single();

      if (error) {
        console.error(`Error creating user ${userData.email}:`, error.message);
      } else {
        this.users.push(data);
        console.log(`✅ Created user: ${userData.email} (${userData.role})`);
      }
    }
  }

  async seedProducts() {
    console.log('🌱 Seeding products...');
    
    const farmers = this.users.filter(user => user.role === 'farmer');
    
    if (farmers.length === 0) {
      console.log('❌ No farmers found. Skipping product seeding.');
      return;
    }

    const productsData = [
      // Farmer 1 products
      {
        farmer_id: farmers[0].id,
        name: 'Organic Tomatoes',
        description: 'Fresh, organic tomatoes grown without pesticides. Perfect for salads and cooking.',
        category: 'Vegetables',
        price: 4.50,
        stock_quantity: 100,
        unit: 'kg',
        is_active: true
      },
      {
        farmer_id: farmers[0].id,
        name: 'Fresh Lettuce',
        description: 'Crispy green lettuce, harvested daily. Great for salads and sandwiches.',
        category: 'Vegetables',
        price: 2.25,
        stock_quantity: 75,
        unit: 'piece',
        is_active: true
      },
      {
        farmer_id: farmers[0].id,
        name: 'Sweet Corn',
        description: 'Sweet and tender corn on the cob. Perfect for grilling or boiling.',
        category: 'Vegetables',
        price: 1.80,
        stock_quantity: 150,
        unit: 'piece',
        is_active: true
      },
      {
        farmer_id: farmers[0].id,
        name: 'Free-Range Eggs',
        description: 'Fresh eggs from free-range chickens. Rich in nutrients and flavor.',
        category: 'Dairy & Eggs',
        price: 6.00,
        stock_quantity: 50,
        unit: 'dozen',
        is_active: true
      },
      // Farmer 2 products (if available)
      ...(farmers[1] ? [
        {
          farmer_id: farmers[1].id,
          name: 'Organic Apples',
          description: 'Crisp and sweet organic apples. Perfect for snacking or baking.',
          category: 'Fruits',
          price: 3.75,
          stock_quantity: 200,
          unit: 'kg',
          is_active: true
        },
        {
          farmer_id: farmers[1].id,
          name: 'Fresh Strawberries',
          description: 'Juicy, sweet strawberries picked at peak ripeness.',
          category: 'Fruits',
          price: 8.50,
          stock_quantity: 30,
          unit: 'kg',
          is_active: true
        },
        {
          farmer_id: farmers[1].id,
          name: 'Organic Carrots',
          description: 'Sweet and crunchy organic carrots. Great for cooking or snacking.',
          category: 'Vegetables',
          price: 2.80,
          stock_quantity: 120,
          unit: 'kg',
          is_active: true
        },
        {
          farmer_id: farmers[1].id,
          name: 'Fresh Herbs Mix',
          description: 'A mix of fresh herbs including basil, parsley, and cilantro.',
          category: 'Herbs',
          price: 5.25,
          stock_quantity: 25,
          unit: 'bunch',
          is_active: true
        },
        {
          farmer_id: farmers[1].id,
          name: 'Seasonal Potatoes',
          description: 'Fresh potatoes perfect for any cooking method.',
          category: 'Vegetables',
          price: 1.95,
          stock_quantity: 300,
          unit: 'kg',
          is_active: true
        }
      ] : [])
    ];

    for (const productData of productsData) {
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) {
        console.error(`Error creating product ${productData.name}:`, error.message);
      } else {
        this.products.push(data);
        console.log(`✅ Created product: ${productData.name} (${productData.category})`);
      }
    }
  }

  async seedOrders() {
    console.log('🌱 Seeding orders...');
    
    const retailers = this.users.filter(user => user.role === 'retailer' && user.is_verified);
    
    if (retailers.length === 0 || this.products.length === 0) {
      console.log('❌ No verified retailers or products found. Skipping order seeding.');
      return;
    }

    const ordersData = [
      {
        retailer_id: retailers[0].id,
        delivery_address: '789 Market Street, Downtown',
        notes: 'Please deliver in the morning',
        status: 'pending',
        items: [
          { product_id: this.products[0].id, quantity: 5 },
          { product_id: this.products[1].id, quantity: 10 }
        ]
      },
      {
        retailer_id: retailers[0].id,
        delivery_address: '789 Market Street, Downtown',
        notes: 'Urgent delivery needed',
        status: 'confirmed',
        items: [
          { product_id: this.products[2].id, quantity: 20 }
        ]
      },
      ...(retailers[1] ? [
        {
          retailer_id: retailers[1].id,
          delivery_address: '321 Commerce Ave, Business District',
          notes: 'Regular weekly order',
          status: 'delivered',
          items: [
            { product_id: this.products[0].id, quantity: 8 },
            { product_id: this.products[3].id, quantity: 3 }
          ]
        }
      ] : [])
    ];

    for (const orderData of ordersData) {
      // Calculate total amount
      let totalAmount = 0;
      const orderItems = [];
      
      for (const item of orderData.items) {
        const product = this.products.find(p => p.id === item.product_id);
        if (product) {
          const itemTotal = product.price * item.quantity;
          totalAmount += itemTotal;
          orderItems.push({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: product.price,
            total_price: itemTotal
          });
        }
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          retailer_id: orderData.retailer_id,
          total_amount: totalAmount,
          status: orderData.status,
          delivery_address: orderData.delivery_address,
          notes: orderData.notes
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError.message);
        continue;
      }

      // Create order items
      for (const item of orderItems) {
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            ...item
          });

        if (itemError) {
          console.error('Error creating order item:', itemError.message);
        }
      }

      this.orders.push(order);
      console.log(`✅ Created order: ${order.id} (${orderData.status}) - $${totalAmount.toFixed(2)}`);
    }
  }

  async seedNotifications() {
    console.log('🌱 Seeding notifications...');
    
    // Send welcome notifications to all users
    for (const user of this.users) {
      if (user.is_verified) {
        try {
          await notificationService.sendWelcomeNotification(user.id, user.full_name);
          console.log(`✅ Sent welcome notification to: ${user.full_name}`);
        } catch (error) {
          console.error(`Error sending welcome notification to ${user.full_name}:`, error.message);
        }
      }
    }

    // Send some sample notifications
    const retailers = this.users.filter(user => user.role === 'retailer' && user.is_verified);
    const farmers = this.users.filter(user => user.role === 'farmer' && user.is_verified);

    if (retailers.length > 0 && this.orders.length > 0) {
      try {
        await notificationService.sendOrderStatusNotification(
          retailers[0].id,
          this.orders[0].id,
          'confirmed',
          'pending'
        );
        console.log('✅ Sent order status notification');
      } catch (error) {
        console.error('Error sending order status notification:', error.message);
      }
    }

    if (farmers.length > 0 && this.products.length > 0) {
      try {
        await notificationService.sendLowStockAlert(
          farmers[0].id,
          this.products[0].id,
          this.products[0].name,
          this.products[0].stock_quantity
        );
        console.log('✅ Sent low stock alert');
      } catch (error) {
        console.error('Error sending low stock alert:', error.message);
      }
    }
  }

  async clearDatabase() {
    console.log('🧹 Clearing existing data...');
    
    const tables = ['notifications', 'order_items', 'orders', 'products', 'users'];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (error && !error.message.includes('No rows found')) {
        console.error(`Error clearing ${table}:`, error.message);
      } else {
        console.log(`✅ Cleared ${table} table`);
      }
    }
  }

  async run(clearFirst = false) {
    try {
      console.log('🚀 Starting database seeding...');
      
      if (clearFirst) {
        await this.clearDatabase();
      }
      
      await this.seedUsers();
      await this.seedProducts();
      await this.seedOrders();
      await this.seedNotifications();
      
      console.log('\n🎉 Database seeding completed successfully!');
      console.log(`\n📊 Summary:`);
      console.log(`   Users: ${this.users.length}`);
      console.log(`   Products: ${this.products.length}`);
      console.log(`   Orders: ${this.orders.length}`);
      
      console.log('\n🔐 Test Credentials:');
      console.log('   Admin: admin@farmmarket.com / admin123');
      console.log('   Farmer: farmer1@example.com / farmer123');
      console.log('   Retailer: retailer1@example.com / retailer123');
      
    } catch (error) {
      console.error('❌ Error during seeding:', error.message);
      process.exit(1);
    }
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  const clearFirst = process.argv.includes('--clear');
  
  seeder.run(clearFirst)
    .then(() => {
      console.log('\n✅ Seeding process completed. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseSeeder;