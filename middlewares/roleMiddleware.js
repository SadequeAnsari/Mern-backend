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

const authorizeLevel6 = (req, res, next) => {
  if (req.user && parseInt(req.user.level) === 6) {
    next();
  } else {
    res.status(403).json({
      message: "Forbidden: You are not authorized to perform this action."
    });
  }
};


const authorizeLevel6Plus = (req, res, next) => {
  if (req.user && parseInt(req.user.level) >= 6) {
    next();
  } else {
    res.status(403).json({
      message: "Forbidden: You are not authorized to perform this action."
    });
  }
};


module.exports = {
  authorizeLevel2,
  authorizeLevel5,
  authorizeLevel6,
  authorizeLevel6Plus
};