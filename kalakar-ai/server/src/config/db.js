import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    // Check if MONGODB_URI is set and valid
    if (!mongoUri) {
      console.error('❌ MongoDB connection error: MONGODB_URI environment variable is not set');
      console.error('   Please set MONGODB_URI in your .env file or v0 settings');
      process.exit(1);
    }

    // Check if it's still a placeholder
    if (mongoUri.includes('user:password') || mongoUri.includes('cluster.mongodb.net') === false) {
      console.error('❌ MongoDB connection error: MONGODB_URI is not configured properly');
      console.error('   Current value:', mongoUri);
      console.error('   Please update MONGODB_URI in your .env file or v0 settings with your actual MongoDB connection string');
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoUri, {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    
    // Provide helpful error messages
    if (err.message.includes('ENOTFOUND')) {
      console.error('\n   Possible causes:');
      console.error('   1. Invalid MongoDB URI - check connection string');
      console.error('   2. Network/DNS issue - check internet connection');
      console.error('   3. MongoDB server down - check MongoDB Atlas status');
      console.error('   4. IP whitelist - add your IP to MongoDB Atlas network access');
    }
    
    process.exit(1);
  }
};
