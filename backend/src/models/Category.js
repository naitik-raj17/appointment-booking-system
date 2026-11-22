const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    icon: { type: String, trim: true, default: 'briefcase' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.statics.slugify = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

module.exports = mongoose.model('Category', categorySchema);
