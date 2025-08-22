const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const AppConfig = require("../config/appConfig");
const catchAsync = require("../../utils/catchAsync");
const AppError = require("../../utils/appError");

const signToken = (id) => {
  return jwt.sign({ id }, AppConfig.jwt.secret, {
    expiresIn: AppConfig.jwt.expiry,
  });
};

const createAndSendToken = (user, statusCode, res, redirect = false) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + AppConfig.jwt.cookieExpiry * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  // for https only
  if (AppConfig.env === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  // remove password from output
  user.password = undefined;
  if (redirect) {
    return res.redirect(
      AppConfig.reactUrl + `/signin?auth=oauth&token=${token}`
    );
  } else {
    return sendSuccessResponse(null, res, statusCode, {
      token,
      user,
      isPro: false,
    });
  }
};

const signup = catchAsync(async (req, res, next) => {
  const { error } = signupSchema.validate(req.body);

  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    return next(
      new AppError(`EmailId Already Exists with MOL : ${existingUser.MOL}`, 400)
    );
  }

  // const referedBy = await User.findOne({ uniqueReferLink: req.body.referId });

  const uniqueReferLink = randomstring.generate({
    length: 10,
    charset: ["alphabetic", "numeric"],
  });

  const newUser = await User.create({
    ...req.body,
    MOL: "EMAIL",
    uniqueReferLink,
  });
  // await ReferList.create({
  //   referedBy: referedBy._id,
  //   referedTo: newUser._id,
  // });

  createAndSendToken(newUser, 201, res);
});

const login = catchAsync(async (req, res, next) => {
  const { error } = loginSchema.validate(req.body);

  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  const { email, password } = req.body;

  // 1) check if email and password exists
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // 2) check if user exists and password is correct
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3) if everything ok , send token to client
  createAndSendToken(user, 200, res);
});

const protect = catchAsync(async (req, res, next) => {
  try {
    // 0) Skip auth if coming from API Auth
    if (req.apiKey) {
      return next();
    }

    // 1) Getting token and check if it exists
    let token = "";
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError("You are not logged in. Please login to get access", 401)
      );
    }

    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, AppConfig.jwt.secret);

    // 3) Check if token is already expired
    if (decoded.exp * 1000 < Date.now()) {
      return next(new AppError("Token is expired. Please login again.", 401));
    }

    // 3) Check if user still exists
    const freshUser = await User.findById(decoded.id);
    if (!freshUser) {
      return next(
        new AppError("The token belonging to this user no longer exists", 401)
      );
    }

    // 4) Check if user changed password after token was issued
    if (!freshUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError("User recently changed password! Please login again.", 401)
      );
    }

    const activeMembershipPlan = await ActiveMembershipPlan.find({
      userId: freshUser._id,
      expiresOn: { $gt: Date.now() },
    });

    freshUser.activeMembershipPlan = activeMembershipPlan;

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = freshUser;
    next();
  } catch (error) {
    return next(new AppError(error.message, 401));
  }
});
