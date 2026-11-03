/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Star, ShieldCheck, CheckCircle2, MessageSquare, AlertCircle, Sparkles, LogIn, Edit3, Trash2 } from 'lucide-react';
import { Product, ProductReview } from '../../types';
import { useStore } from '../../context/StoreContext';
import { calculateReviewSummary, validateReviewInput } from '../../utils/ecommerce-logic';

interface ProductReviewsSectionProps {
  product: Product;
  openAuthModal?: () => void;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  product,
  openAuthModal,
}) => {
  const {
    reviews,
    currentUser,
    hasOrderedProduct,
    getUserReviewForProduct,
    addReview,
    deleteReview,
  } = useStore();

  // Filter reviews belonging to this product
  const productReviews = useMemo(() => {
    return reviews
      .filter((r) => r.product_id === product.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [reviews, product.id]);

  const summary = useMemo(() => {
    return calculateReviewSummary(productReviews);
  }, [productReviews]);

  // Check order and review status for current user
  const hasOrdered = useMemo(() => {
    return hasOrderedProduct(product.id);
  }, [hasOrderedProduct, product.id]);

  const existingReview = useMemo(() => {
    return getUserReviewForProduct(product.id);
  }, [getUserReviewForProduct, product.id]);

  // Form State
  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [isEditing, setIsEditing] = useState<boolean>(!existingReview);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync state if existing review loads/changes
  React.useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [existingReview]);

  const ratingLabels: Record<number, string> = {
    1: '1 - Poor',
    2: '2 - Fair',
    3: '3 - Good',
    4: '4 - Very Good',
    5: '5 - Excellent',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = validateReviewInput(rating, comment);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Please provide a valid rating and review.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = addReview({
        productId: product.id,
        rating,
        comment,
      });

      if (!result.success) {
        setErrorMessage(result.message);
      } else {
        setIsEditing(false);
        setErrorMessage(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (existingReview && window.confirm('Are you sure you want to remove your review?')) {
      deleteReview(existingReview.id);
      setComment('');
      setRating(5);
      setIsEditing(true);
    }
  };

  return (
    <section id="reviews-section" className="bg-white rounded-[12px] border border-[#E4DFD1] p-6 sm:p-8 space-y-8 shadow-[0_4px_20px_rgba(15,59,46,0.04)]">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4DFD1] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#3B2A20]">
              Customer Reviews
            </h2>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#DDE3D3] text-[#3B2A20] border border-[#8A9A7B]/40">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8A9A7B]" />
              Verified Buyers
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6B5B50]">
            Real feedback from customers who have purchased and tested this product.
          </p>
        </div>

        {summary.totalReviews > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white border border-[#E3D5C4] px-4 py-2 rounded-full shadow-xs">
            <div className="flex text-[#C98A12]">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    s <= Math.round(summary.averageRating)
                      ? 'fill-[#C98A12] text-[#C98A12]'
                      : 'text-[#E3D5C4] fill-transparent'
                  }`}
                  strokeWidth={1.5}
                />
              ))}
            </div>
            <span className="font-bold text-xs text-[#3B2A20]">{summary.averageRating} out of 5</span>
            <span className="text-xs text-[#6B5B50]">({summary.totalReviews})</span>
          </div>
        )}
      </div>

      {/* Ratings & Breakdown Summary */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#FBF5EC] rounded-[24px] p-5 sm:p-6 border border-[#E3D5C4]">
        {/* Score Overview */}
        <div className="md:col-span-4 flex flex-col justify-center items-center text-center p-4 bg-white rounded-[16px] border border-[#E3D5C4] shadow-xs">
          <span className="font-serif text-5xl font-extrabold text-[#3B2A20] tracking-tight">
            {summary.totalReviews > 0 ? summary.averageRating : '—'}
          </span>
          <div className="flex text-[#C98A12] my-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-5 h-5 ${
                  s <= Math.round(summary.averageRating)
                    ? 'fill-[#C98A12] text-[#C98A12]'
                    : 'text-[#E3D5C4] fill-[#E3D5C4]/30'
                }`}
                strokeWidth={1.5}
              />
            ))}
          </div>
          <p className="text-xs font-semibold text-[#3B2A20]">
            {summary.totalReviews > 0
              ? `Based on ${summary.totalReviews} verified review${summary.totalReviews === 1 ? '' : 's'}`
              : 'No reviews yet'}
          </p>
          <p className="text-[11px] text-[#6B5B50] mt-1">
            100% authentic feedback from confirmed orders
          </p>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="md:col-span-5 flex flex-col justify-center space-y-2">
          {([5, 4, 3, 2, 1] as const).map((starVal) => {
            const count = summary.ratingCounts[starVal];
            const pct = summary.ratingPercentages[starVal];
            return (
              <div key={starVal} className="flex items-center gap-3 text-xs">
                <span className="w-12 font-medium text-[#3B2A20] flex items-center gap-1 justify-end">
                  {starVal} <Star className="w-3 h-3 fill-[#C98A12] text-[#C98A12]" />
                </span>
                <div className="flex-1 h-2.5 bg-[#E3D5C4]/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#B4502F] transition-all duration-300 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[11px] text-[#6B5B50] tabular-nums font-mono">
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Trust & Guarantee Callout */}
        <div className="md:col-span-3 flex flex-col justify-center p-4 bg-white rounded-[16px] border border-[#E3D5C4] text-xs text-[#6B5B50] space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-[#3B2A20]">
            <CheckCircle2 className="w-4 h-4 text-[#2E7D4F]" />
            <span>100% Genuine Reviews</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Only customers with verified delivered or confirmed orders are eligible to submit reviews.
          </p>
          <div className="pt-2 border-t border-[#E3D5C4] flex items-center gap-1 text-[11px] text-[#8A9A7B] font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Honest Craftsmanship</span>
          </div>
        </div>
      </div>

      {/* Review Submission Area based on Customer Status */}
      <div className="pt-2">
        {!currentUser ? (
          /* GUEST STATE */
          <div className="rounded-[24px] border border-[#E3D5C4] bg-[#FBF5EC] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-white border border-[#E3D5C4] flex items-center justify-center shrink-0 text-[#3B2A20]">
                <ShieldCheck className="w-5 h-5 text-[#8A9A7B]" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-[#3B2A20]">
                  Have you purchased this product?
                </h3>
                <p className="text-xs sm:text-sm text-[#6B5B50] mt-0.5">
                  Sign in to your customer account to submit a verified rating and review.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (openAuthModal) {
                  openAuthModal();
                } else {
                  window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
                }
              }}
              className="px-5 py-2.5 rounded-full bg-[#B4502F] hover:bg-[#a04426] text-white font-semibold text-xs min-h-[44px] transition-all flex items-center gap-2 shrink-0 shadow-sm cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-white" />
              <span>Sign In to Review</span>
            </button>
          </div>
        ) : !hasOrdered ? (
          /* LOGGED IN BUT HAS NOT ORDERED */
          <div className="rounded-[24px] border border-[#E3D5C4] bg-[#FBF5EC] p-5 sm:p-6 flex items-start gap-3.5 text-xs text-[#6B5B50]">
            <div className="w-9 h-9 rounded-full bg-white border border-[#E3D5C4] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-[#8A9A7B]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-[#3B2A20]">
                  Verified Purchase Required
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white border border-[#E3D5C4] text-[#6B5B50]">
                  Account: {currentUser.full_name}
                </span>
              </div>
              <p className="leading-relaxed">
                To maintain authentic customer feedback, reviews can only be submitted by customers who have previously ordered this item. Once your order is placed, you can share your thoughts here.
              </p>
            </div>
          </div>
        ) : (
          /* LOGGED IN AND HAS ORDERED: SUBMISSION FORM OR EXISTING REVIEW VIEW */
          <div className="rounded-[24px] border border-[#E3D5C4] bg-[#FBF5EC] p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E3D5C4] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D4F]" />
                <h3 className="font-serif text-base font-bold text-[#3B2A20]">
                  {existingReview && !isEditing ? 'Your Verified Review' : 'Write a Verified Review'}
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#DDE3D3] text-[#3B2A20] font-medium border border-[#8A9A7B]/40">
                  Verified Purchaser: {currentUser.full_name}
                </span>
              </div>
              {existingReview && !isEditing && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border border-[#3B2A20] text-[#3B2A20] hover:bg-[#3B2A20] hover:text-[#F3E9DC] transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border border-[#B3372F]/30 text-[#B3372F] hover:bg-[#B3372F]/10 transition-all cursor-pointer"
                    title="Remove review"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {existingReview && !isEditing ? (
              /* Display already-submitted review */
              <div className="bg-white rounded-[16px] p-4 border border-[#E3D5C4] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex text-[#C98A12]">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= existingReview.rating
                            ? 'fill-[#C98A12] text-[#C98A12]'
                            : 'text-[#E3D5C4] fill-transparent'
                        }`}
                        strokeWidth={1.5}
                      />
                    ))}
                    <span className="text-xs font-bold text-[#3B2A20] ml-2">
                      {ratingLabels[existingReview.rating]}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#6B5B50]">
                    {new Date(existingReview.created_at).toLocaleDateString('en-PK', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#3B2A20] leading-relaxed whitespace-pre-line">
                  {existingReview.comment}
                </p>
              </div>
            ) : (
              /* Review Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-[12px] bg-[#B3372F]/10 border border-[#B3372F]/30 text-xs text-[#B3372F]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Star Rating Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[#3B2A20] uppercase tracking-wider mb-1.5">
                    Your Rating <span className="text-[#B3372F]">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-1" onMouseLeave={() => setHoverRating(0)}>
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const activeLevel = hoverRating || rating;
                        const isFilled = starVal <= activeLevel;
                        return (
                          <button
                            key={starVal}
                            type="button"
                            onClick={() => setRating(starVal)}
                            onMouseEnter={() => setHoverRating(starVal)}
                            aria-label={`Rate ${starVal} star${starVal > 1 ? 's' : ''}`}
                            className="p-1 focus:outline-hidden transform transition hover:scale-110 active:scale-95 cursor-pointer"
                          >
                            <Star
                              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                                isFilled
                                  ? 'fill-[#C98A12] text-[#C98A12] drop-shadow-xs'
                                  : 'text-[#E3D5C4] fill-transparent'
                              }`}
                              strokeWidth={1.5}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs font-bold text-[#3B2A20] ml-2 px-3 py-1 rounded-full bg-white border border-[#E3D5C4]">
                      {ratingLabels[hoverRating || rating]}
                    </span>
                  </div>
                </div>

                {/* Review Text */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label
                      htmlFor="review-comment"
                      className="block text-xs font-semibold text-[#3B2A20] uppercase tracking-wider"
                    >
                      Your Review <span className="text-[#B3372F]">*</span>
                    </label>
                    <span className="text-[11px] text-[#6B5B50]">
                      {comment.length}/1000 characters
                    </span>
                  </div>
                  <textarea
                    id="review-comment"
                    rows={4}
                    value={comment}
                    maxLength={1000}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe the fabric quality, stitching, scent longevity, fit accuracy, and overall experience..."
                    className="w-full text-xs sm:text-sm p-3.5 rounded-[12px] border border-[#E3D5C4] bg-white text-[#3B2A20] focus:border-[#B4502F] focus:ring-1 focus:ring-[#B4502F] outline-hidden leading-relaxed shadow-inner"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-3 px-6 rounded-full bg-[#B4502F] hover:bg-[#a04426] disabled:bg-[#E3D5C4] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>{existingReview ? 'Update Review' : 'Submit Verified Review'}</span>
                  </button>

                  {existingReview && (
                    <button
                      type="button"
                      onClick={() => {
                        setRating(existingReview.rating);
                        setComment(existingReview.comment);
                        setIsEditing(false);
                        setErrorMessage(null);
                      }}
                      className="py-3 px-5 rounded-full border border-[#E3D5C4] bg-white text-[#6B5B50] hover:bg-[#F3E9DC] font-semibold text-xs transition-colors min-h-[44px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Customer Reviews List */}
      <div className="space-y-4 pt-2">
        <h3 className="font-serif text-lg font-bold text-[#3B2A20] flex items-center justify-between">
          <span>Customer Feedback ({productReviews.length})</span>
        </h3>

        {productReviews.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-[24px] border border-dashed border-[#E3D5C4] bg-white/60 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#DDE3D3] border border-[#8A9A7B]/30 flex items-center justify-center mx-auto text-[#8A9A7B]">
              <MessageSquare className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <h4 className="font-serif text-base font-bold text-[#3B2A20]">No Reviews Yet</h4>
            <p className="text-xs text-[#6B5B50] max-w-md mx-auto">
              Be the first verified customer to share your thoughts on this product once you receive your order!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E3D5C4]/60">
            {productReviews.map((rev) => {
              const reviewerInitial = rev.user_name ? rev.user_name.charAt(0).toUpperCase() : 'B';
              const formattedDate = new Date(rev.created_at).toLocaleDateString('en-PK', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <article key={rev.id} className="py-5 first:pt-2 last:pb-2 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-[#3B2A20] text-[#F3E9DC] font-serif font-bold text-sm flex items-center justify-center shadow-xs">
                        {reviewerInitial}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-[#3B2A20]">
                            {rev.user_name}
                          </span>
                          {rev.verified_purchase && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2E7D4F] bg-[#DDE3D3] px-2.5 py-0.5 rounded-full border border-[#2E7D4F]/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified Buyer
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#6B5B50] block">
                          Purchased &amp; Verified Delivery
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center">
                      <div className="flex text-[#C98A12]">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating
                                ? 'fill-[#C98A12] text-[#C98A12]'
                                : 'text-[#E3D5C4] fill-transparent'
                            }`}
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                      <time dateTime={rev.created_at} className="text-[11px] text-[#6B5B50] ml-1">
                        {formattedDate}
                      </time>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#3B2A20] leading-relaxed pl-12 whitespace-pre-line">
                    {rev.comment}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
