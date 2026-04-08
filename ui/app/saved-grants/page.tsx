"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useWishlistStore } from "@/store/useWishListStore";
import GrantSummaryCard from "@/components/GrantSummaryCard";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/ui/Button";
import { BookmarkIcon } from "@heroicons/react/24/solid";
import Loading from "../loading";

const SavedGrantsPage = () => {
  const { user } = useAuthStore();
  const {
    wishlistDetails,
    isLoading,
    fetchWishlistDetails,
    removeFromWishlist,
    isInWishlist,
  } = useWishlistStore();

  useEffect(() => {
    if (user?.id) fetchWishlistDetails(user.id);
  }, [user?.id, fetchWishlistDetails]);

  const handleRemoveFromWishlist = (grantId: string) => {
    if (user?.id) removeFromWishlist(user.id, grantId);
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center dark:border-slate-700 dark:bg-slate-800/30">
            <div className="mb-4 rounded-full bg-white p-4 shadow-sm dark:bg-slate-800">
              <BookmarkIcon className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Login to see your saved grants
            </h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Sign in to view and manage grants you’ve saved.
            </p>
            <Button href="/login" intent="primary" className="mt-6">
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && wishlistDetails.length === 0) {
    return <Loading title="Loading saved grants..." />;
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          variant="grants"
          title="Saved Grants"
          subtitle="Grants you’ve saved for later. Remove any time."
        />

        {wishlistDetails.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center dark:border-slate-700 dark:bg-slate-800/30">
            <div className="mb-4 rounded-full bg-white p-4 shadow-sm dark:bg-slate-800">
              <BookmarkIcon className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              No saved grants yet
            </h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Browse grants and click the bookmark to save them here.
            </p>
            <Button href="/grants" intent="primary" className="mt-6">
              Browse grants
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {wishlistDetails.map((grant, index: number) => (
              <GrantSummaryCard
                key={grant.id}
                grant={grant}
                isLoggedIn={!!user}
                isWishlisted={isInWishlist(grant.id)}
                onWishlistToggle={handleRemoveFromWishlist}
                animationDelay={index * 0.05}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedGrantsPage;
