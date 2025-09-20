const authorizeLevel5 = (req, res, next) => {
  if (req.user && parseInt(req.user.level) >= 5) {
    next();
  } else {
    res.status(403).json({
      message: "Forbidden: You are not authorized to perform this action."
    });
  }
};

const authorizeLevel2 = (req, res, next) => {
  if (req.user && parseInt(req.user.level) >= 2) {
    next();
  } else {
    res.status(403).json({
      message: "Forbidden: You are not authorized to view this page."
    });
  }
};

module.exports = {
  authorizeLevel2,
  authorizeLevel5
};