const mongoose = require('mongoose');

const connectDB = async () => {
  const connStr = process.env.MONGODB_URI;
  if (!connStr) {
    throw new Error('MONGODB_URI environment variable is missing.');
  }
  
  const conn = await mongoose.connect(connStr);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;
