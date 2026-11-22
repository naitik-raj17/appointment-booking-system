const { Category, ProviderProfile } = require('../models');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../services/activityService');

async function withProviderCounts(categories) {
  const counts = await ProviderProfile.aggregate([{ $match: { isApproved: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }]);
  const map = new Map(counts.map((c) => [String(c._id), c.count]));
  return categories.map((c) => ({ ...c, providerCount: map.get(String(c._id)) || 0 }));
}

async function listPublic(_req, res) {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
  res.json({ data: await withProviderCounts(categories) });
}

async function listAll(_req, res) {
  const categories = await Category.find().sort({ name: 1 }).lean();
  res.json({ data: await withProviderCounts(categories) });
}

async function create(req, res) {
  const slug = Category.slugify(req.body.name);
  if (await Category.exists({ $or: [{ slug }, { name: req.body.name }] })) throw ApiError.conflict('A category with this name already exists');
  const category = await Category.create({ ...req.body, slug });
  await logActivity(req.user, 'category.created', { entityType: 'Category', entityId: category._id, description: `Created category ${category.name}` });
  res.status(201).json({ data: category });
}

async function update(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  const slug = Category.slugify(req.body.name);
  if (await Category.exists({ _id: { $ne: category._id }, $or: [{ slug }, { name: req.body.name }] })) {
    throw ApiError.conflict('A category with this name already exists');
  }
  Object.assign(category, req.body, { slug });
  await category.save();
  await logActivity(req.user, 'category.updated', { entityType: 'Category', entityId: category._id, description: `Updated category ${category.name}` });
  res.json({ data: category });
}

async function remove(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  const inUse = await ProviderProfile.countDocuments({ category: category._id });
  if (inUse > 0) {
    throw ApiError.conflict(`${inUse} provider(s) use this category. Deactivate it instead of deleting.`, 'CATEGORY_IN_USE');
  }
  await category.deleteOne();
  await logActivity(req.user, 'category.deleted', { entityType: 'Category', entityId: category._id, description: `Deleted category ${category.name}` });
  res.json({ data: { id: category._id } });
}

module.exports = { listPublic, listAll, create, update, remove };
