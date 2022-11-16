const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const Role = db.role;
const RefreshToken = db.refreshToken;
let jwt = require("jsonwebtoken");
let bcrypt = require("bcryptjs");
const authConfig = require("../config/auth.config");
const { generateOTP } = require("../utils/otp.util");
const { refreshToken } = require("../models");

exports.signup = (req, res) => {
    const user = new User({
        username: req.body.username,
        password: bcrypt.hashSync(req.body.password, 8),
        isAccountVerified: false,
        isMobileVerified: false,
        isEmailVerified: false
    });

    if (req.body.phoneNumber) {
        user.phoneNumber = req.body.phoneNumber,
            user.phoneOtp = generateOTP(6)
    }

    if (req.body.email) {
        user.email = req.body.email,
            user.emailOtp = generateOTP(6)
    }

    if (req.body.email && req.body.phoneNumber) {
        user.phoneNumber = req.body.phoneNumber,
            user.email = req.body.email,
            user.phoneOtp = generateOTP(3),
            user.emailOtp = generateOTP(3)
    }

    user.save((err, user) => {
        if (err) {
            res.status(500).send({ message: err });
            return;
        }
        if (req.body.roles) {
            Role.find(
                {
                    name: { $in: req.body.roles }
                },
                (err, roles) => {
                    if (err) {
                        res.status(500).send({ message: err });
                        return;
                    }

                    user.roles = roles.map(role => role._id);
                    user.save(err => {
                        if (err) {
                            res.status(500).send({ message: err });
                            return;
                        }

                        res.send({ message: "User was registered successfully!" });
                    });
                }
            );
        } else {
            Role.findOne({ name: "user" }, (err, role) => {
                if (err) {
                    res.status(500).send({ message: err });
                    return;
                }
                user.roles = [role._id];
                user.save(err => {
                    if (err) {
                        res.status(500).send({ message: err });
                        return;
                    }

                    res.send({ message: "User was registered successfully!" });
                });
            });
        }
    });
};

exports.verifyOtp = async (req, res) => {
    const { phoneNumber, email, otp } = req.body;
    if (phoneNumber) {
        User.findOne({
            phoneNumber: phoneNumber
        }).exec(async (err, user) => {
            if (err) {
                res.status(500).send({ message: err });
                return;
            }
            if (user && user.phoneOtp.toString() === otp.toString()) {
                user.isMobileVerified = true;
                user.phoneOtp = "";
                user.isAccountVerified = user.isMobileVerified && user.isEmailVerified;
                await user.save();
                res.status(200).send({ type: "success", message: "OTP verified successfully" });
                return;
            }
            res.status(400).send({ type: "error", message: "OTP not matching, pelease try again" });
            return;
        });
    }

    if (email) {
        User.findOne({
            email: email
        }).exec(async (err, user) => {
            if (err) {
                res.status(500).send({ message: err });
                return;
            }
            if (user && user.emailOtp.toString() === otp.toString()) {
                console.log(user, "user")
                user.isEmailVerified = true;
                user.emailOtp = "";
                user.isAccountVerified = user.isMobileVerified && user.isEmailVerified;
                await user.save();
                res.send({ type: "success", message: "OTP verified successfully" });
                return;
            }
            res.status(400).send({ type: "error", message: "OTP not matching, pelease try again" });
            return;
        });
    }

    if (phoneNumber && email) {
        User.findOne({
            phoneNumber: phoneNumber,
            email: email
        }).exec(async (err, user) => {
            if (err) {
                res.status(500).send({ message: err });
                return;
            }
            if (user && `${user.phoneOtp.toString()}${user.emailOtp.toString()}` === otp.toString()) {
                user.isMobileVerified = true;
                user.phoneOtp = "";
                user.isEmailVerified = true;
                user.emailOtp = "";
                user.isAccountVerified = user.isMobileVerified && user.isEmailVerified;
                await user.save();
                res.status(200).send({ type: "success", message: "OTP verified successfully" });
                return;
            }
            res.status(400).send({ type: "error", message: "OTP not matching, pelease try again" });
            return;
        });
    }
};

exports.signin = async (req, res) => {
    User.findOne({
        username: req.body.username
    })
        .populate("roles", "-__v")
        .exec(async (err, user) => {
            if (err) {
                res.status(500).send({ message: err });
                return;
            }

            if (!user) {
                return res.status(404).send({ message: "User Not found." });
            }

            let passwordIsValid = bcrypt.compareSync(
                req.body.password,
                user.password
            );

            if (!passwordIsValid) {
                return res.status(401).send({
                    accessToken: null,
                    message: "Invalid Password!"
                });
            }

            let token = jwt.sign({ id: user.id }, config.secret, {
                expiresIn: authConfig.jwtExpiration // 24 hours
            });

            let refreshTokenGen = await refreshToken.createToken(user);

            let authorities = [];

            for (let i = 0; i < user.roles.length; i++) {
                authorities.push("ROLE_" + user.roles[i].name.toUpperCase());
            }
            res.status(200).send({
                id: user._id,
                username: user.username,
                email: user.email,
                roles: authorities,
                accessToken: token,
                refreshToken: refreshTokenGen
            });
        });


};

exports.refreshToken = async (req, res) => {
    const { refreshToken: requestToken } = req.body;

    if (requestToken == null) {
        return res.status(403).json({ message: "Refresh Token is required!" });
    }

    try {
        let refreshToken = await RefreshToken.findOne({ token: requestToken });

        if (!refreshToken) {
            res.status(403).json({ message: "Refresh token is not in database!" });
            return;
        }

        if (RefreshToken.verifyExpiration(refreshToken)) {
            RefreshToken.findByIdAndRemove(refreshToken._id, { useFindAndModify: false }).exec();

            res.status(403).json({
                message: "Refresh token was expired. Please make a new signin request",
            });
            return;
        }

        let newAccessToken = jwt.sign({ id: refreshToken.user._id }, config.secret, {
            expiresIn: config.jwtExpiration,
        });

        return res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: refreshToken.token,
        });
    } catch (err) {
        console.log(err)
        return res.status(500).send({ message: err });
    }
};
