const SKELETON_ITEMS = 4;

export function DashboardSkeleton() {
  return (
    <div className="dashboardGrid" aria-hidden>
      {Array.from({ length: SKELETON_ITEMS }).map((_, index) => (
        <article key={index} className="eventCard skeletonCard">
          <div className="eventCardMedia" />
          <div className="eventCardBody" />
        </article>
      ))}
    </div>
  );
}
