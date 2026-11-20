import {SkeletonBlock} from '../../components/LoadingSkeleton';

export default function Loading(){
 return <main className="skeleton-loading mx-auto min-h-screen max-w-2xl px-5 pb-safe pt-[max(1.25rem,env(safe-area-inset-top))] md:px-6 md:py-16">
  <span role="status" className="sr-only">Loading My Booking</span>
  <div aria-hidden="true">
   <SkeletonBlock className="mx-auto h-11 w-48"/>
   <SkeletonBlock className="mt-8 h-4 w-28"/>
   <SkeletonBlock className="mt-4 h-12 w-4/5"/>
   <SkeletonBlock className="mt-4 h-4 w-5/6"/>
   <div className="lookup-panel card mt-8 grid gap-5 p-4 sm:grid-cols-2 sm:p-6">
    {[0,1].map(index=><div key={index}><SkeletonBlock className="mb-2 h-4 w-28"/><SkeletonBlock className="h-11"/></div>)}
    <SkeletonBlock className="h-11 w-full sm:w-36"/>
   </div>
   <SkeletonBlock className="mt-6 h-11"/>
  </div>
 </main>;
}
