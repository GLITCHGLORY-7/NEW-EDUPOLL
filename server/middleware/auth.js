const jwt = require('jsonwebtoken');
const { supabase } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'poolsync-super-secret-key';

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'No token provided' });
  
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      console.error("JWT Verify Error:", err.message, "Token:", token.substring(0, 20) + "...");
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user still exists in DB
    if (decoded.role === 'staff') {
      const { data: rows, error } = await supabase.from('users').select('id').eq('id', decoded.id).limit(1);
      const data = rows && rows.length > 0 ? rows[0] : null;
      if (error) console.error("verifyToken staff error:", error);
      if (!data) return res.status(401).json({ error: 'User no longer exists' });

    } else {
      const { data, error } = await supabase.from('students').select('id').eq('id', decoded.id).limit(1);
      if (error) console.error("verifyToken student error:", error, "decoded:", decoded);
      if (!data || data.length === 0) {
        console.error("verifyToken student not found for decoded id:", decoded.id);
        return res.status(401).json({ error: 'User no longer exists' });
      }
    }

    req.user = decoded;
    next();
  });
};

module.exports = { verifyToken, JWT_SECRET };
