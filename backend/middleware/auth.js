const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header - check both formats
  let token = req.header('x-auth-token');
  
  // Check for Bearer token in Authorization header
  const authHeader = req.header('Authorization');
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;  // Backend expects full decoded payload, not decoded.user
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
}; 