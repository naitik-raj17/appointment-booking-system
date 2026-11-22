const mongoose = require('mongoose');

const providerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    specialization: { type: String, required: true, trim: true, maxlength: 100 },
    bio: { type: String, trim: true, maxlength: 1500, default: '' },
    experienceYears: { type: Number, min: 0, max: 70, default: 0 },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    address: { type: String, trim: true, maxlength: 200, default: '' },
    price: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'USD', maxlength: 3 },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
    isApproved: { type: Boolean, default: false, index: true },
    ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

providerProfileSchema.index({ isApproved: 1, category: 1, price: 1 });

/**
 * Atomically folds a new rating into the running average:
 * avg' = (avg·n + r) / (n + 1). A pipeline update reads the old values inside
 * the same write, so concurrent reviews cannot lose updates.
 */
providerProfileSchema.statics.applyRating = function applyRating(profileId, rating) {
  return this.updateOne({ _id: profileId }, [
    {
      $set: {
        ratingCount: { $add: ['$ratingCount', 1] },
        ratingAverage: {
          $round: [
            { $divide: [{ $add: [{ $multiply: ['$ratingAverage', '$ratingCount'] }, rating] }, { $add: ['$ratingCount', 1] }] },
            1,
          ],
        },
      },
    },
  ]);
};

module.exports = mongoose.model('ProviderProfile', providerProfileSchema);
