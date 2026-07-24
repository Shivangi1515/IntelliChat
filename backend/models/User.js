import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        default: "User"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook to hash password
UserSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return next();
    try {
        const salt = await bcryptjs.genSalt(10);
        this.password = await bcryptjs.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return bcryptjs.compare(candidatePassword, this.password);
};

export default mongoose.model("User", UserSchema);
