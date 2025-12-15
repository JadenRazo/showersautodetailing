import { useEffect, useState } from 'react';

interface Review {
  id: number;
  customer_name: string;
  rating: number;
  review_text: string;
  created_at: string;
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || '';

        const [reviewsRes, statsRes] = await Promise.all([
          fetch(`${apiUrl}/api/reviews`),
          fetch(`${apiUrl}/api/reviews/stats`)
        ]);

        const reviewsData = await reviewsRes.json();
        const statsData = await statsRes.json();

        setReviews(reviewsData.slice(0, 6)); // Show first 6 reviews
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-[#EB6C1D] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Overview */}
      {stats && (
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="text-center">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {parseFloat(stats.average_rating).toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-1 mb-2">
              {renderStars(Math.round(parseFloat(stats.average_rating)))}
            </div>
            <div className="text-gray-600">
              Based on {stats.total_reviews} reviews
            </div>
          </div>
        </div>
      )}

      {/* Reviews Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FDE8D9] rounded-full flex items-center justify-center">
                    <span className="text-[#EB6C1D] font-semibold text-lg">
                      {review.customer_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{review.customer_name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mb-3">{renderStars(review.rating)}</div>
              <p className="text-gray-700">{review.review_text}</p>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            No reviews yet. Be the first to leave a review!
          </div>
        )}
      </div>
    </div>
  );
}
