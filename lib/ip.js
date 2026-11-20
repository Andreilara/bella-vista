export const ip=req=>req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'local';
