'use client';
export default function Error({reset}){return <main className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="font-display h-xl">Something went wrong</h1><p className="mt-3 text-ash">Please try again.</p><button onClick={reset} className="btn mt-6">Try again</button></div></main>}
