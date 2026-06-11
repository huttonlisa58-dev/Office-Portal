import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not defined');

  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(uri, {
    autoIndex: process.env.NODE_ENV !== 'production',
  });
  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn;
};
