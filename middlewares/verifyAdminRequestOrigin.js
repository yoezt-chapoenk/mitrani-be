const verifyAdminRequestOrigin = (req, res, next) => {
  const frontendUrl = process.env.FRONTEND_URL;
  const origin = req.headers.origin || req.headers.referer || '';
  const userAgent = req.headers['user-agent'] || '';
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  
  // Log semua request admin untuk monitoring
  console.log(`[ADMIN REQUEST] IP: ${clientIP}, Origin: ${origin}, User-Agent: ${userAgent}, Path: ${req.path}`);
  
  // Jika origin mengandung FRONTEND_URL (domain farmer & retailer), blokir akses
  if (frontendUrl && origin.includes(frontendUrl)) {
    console.log(`[ADMIN ACCESS BLOCKED] Request to admin endpoint blocked from frontend origin: ${origin}`);
    console.log(`[ADMIN ACCESS BLOCKED] IP: ${clientIP}, Path: ${req.path}, Time: ${new Date().toISOString()}`);
    
    return res.status(403).json({
      success: false,
      message: 'Access to admin endpoint is forbidden from this origin',
      error: 'ADMIN_ACCESS_FORBIDDEN'
    });
  }
  
  // Jika origin berbeda (misalnya admin frontend dengan domain terpisah), lanjutkan
  console.log(`[ADMIN ACCESS ALLOWED] Request to admin endpoint allowed from origin: ${origin}`);
  next();
};

module.exports = verifyAdminRequestOrigin;