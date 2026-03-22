const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      enum: {
        values: ['Burgers', 'Pizza', 'Chicken', 'Beverages', 'Desserts', 'Sides', 'Other'],
        message: '{VALUE} is not a valid category',
      },
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      required: [true, 'createdBy (user/company ID) is required'],
      trim: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for faster search queries
productSchema.index({ name: 'text', category: 1 });
productSchema.index({ isAvailable: 1, category: 1 });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
