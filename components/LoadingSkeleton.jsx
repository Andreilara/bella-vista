export function SkeletonBlock({className = ""}) {
  return <div aria-hidden="true" className={"skeleton-block " + className}/>;
}

const blocks=(count,className)=>Array.from({length:count},(_,index)=><SkeletonBlock key={index} className={className}/>);

export default function LoadingSkeleton({label = "Loading page", variant = "content", tone, className = ""}) {
  return <div className={"skeleton-loading " + className} data-tone={tone}>
    <span role="status" className="sr-only">{label}</span>
    {variant === "booking" ? <div aria-hidden="true" className="reserve-layout">
      <div className="reserve-form space-y-5">
        <div className="grid grid-cols-3 gap-3">{blocks(3,"h-9")}</div>
        <SkeletonBlock className="h-6 w-48 max-w-full"/>
        <div className="grid gap-3 sm:grid-cols-3">{blocks(3,"h-20")}</div>
        <div className="reserve-stay-grid">
          <div className="reserve-calendar space-y-3">
            <SkeletonBlock className="mx-auto h-6 w-32"/>
            <div className="grid grid-cols-7 gap-1">{blocks(28,"h-8 sm:h-10")}</div>
          </div>
          <div className="space-y-3 pt-2"><SkeletonBlock className="h-5 w-28"/><SkeletonBlock className="h-11 w-32"/><SkeletonBlock className="h-5 w-36"/></div>
        </div>
        <SkeletonBlock className="ml-auto h-11 w-32"/>
      </div>
      <aside data-tone="dark" className="reserve-summary reserve-summary-desktop space-y-4">
        <SkeletonBlock className="h-7 w-28"/>
        {blocks(4,"h-4")}
      </aside>
    </div> : <div aria-hidden="true" className="space-y-5">
      {variant === "staff" && <div className="flex flex-wrap gap-3 border-b border-line pb-5">{blocks(3,"h-10 w-24")}</div>}
      <SkeletonBlock className="h-9 w-3/5 max-w-xs"/>
      <SkeletonBlock className="h-4 w-4/5 max-w-md"/>
      {variant === "timeline" ? <div className="staff-panel space-y-2 p-4">
        <div className="grid grid-cols-7 gap-2">{blocks(7,"h-8")}</div>
        {blocks(7,"h-9")}
      </div> : variant === "reports" ? <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{blocks(4,"h-20")}</div>
        <div className="staff-panel flex h-52 items-end gap-3 p-5">
          {["h-1/3","h-1/2","h-2/5","h-3/4","h-3/5","h-4/5"].map(height=><SkeletonBlock key={height} className={'flex-1 '+height}/>)}
        </div>
      </> : variant === "page" ? <>
        <SkeletonBlock className="h-48 sm:h-64"/><SkeletonBlock className="h-4 w-3/4"/><SkeletonBlock className="h-4 w-1/2"/>
      </> : <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
        {blocks(4,"h-10")}
      </div>}
    </div>}
  </div>;
}
