import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

class Preference extends Model {}

Preference.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    learning_goal: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    interested_topics: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "[]",
      get() {
        const rawValue = this.getDataValue('interested_topics');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(val) {
        this.setDataValue('interested_topics', JSON.stringify(val || []));
      }
    },
    experience_level: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Beginner",
    },
    weekly_commitment: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "5-10 hours",
    },
    learning_style: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Visual",
    },
  },
  {
    sequelize,
    modelName: "Preference",
    tableName: "Preferences",
    timestamps: true,
  }
);

export default Preference;
