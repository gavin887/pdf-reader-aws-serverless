const winston = require('winston');
const _ = require("lodash");

const {format: wformat} = winston;
const {Sequelize, Model, DataTypes, Op} = require("sequelize");
const mysql2 = require('mysql2');

class Issues extends Model {}
class Cases extends Model {}

const databaseInitialize = () => {

    const logger = winston.createLogger({
        transports: [
            new winston.transports.Console({
                format: wformat.combine(wformat.colorize(), winston.format.simple()),
                level: 'info'
            }),
        ]
    })

    const mysqlOptions = {
        dialect: 'mysql',
        dialectModule: mysql2,
        host: process.env.DB_HOST,
        logging: msg => logger.debug(msg)
    };
    const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, mysqlOptions);

    Issues.init({
        id: {type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true},
        fileSign: {type: DataTypes.STRING(48), notNull: true, default: ""},
        fileUrl: {type: DataTypes.STRING(255), notNull: true, default: ""},
        issueDate: {type: DataTypes.STRING(24), notNull: true, default: ""},
    }, {sequelize, modelName: 'issues', createdAt: true});

    Cases.init({
        id: {type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true},
        fileSign: {type: DataTypes.STRING(48), notNull: true, default: ""},
        issueDate: {type: DataTypes.STRING(10), notNull: true, default: ""},
        audienceNumber: {type: DataTypes.STRING(48), notNull: true, default: ""},
        audienceType: {type: DataTypes.STRING(128), notNull: true, default: ""},
        secretary: {type: DataTypes.STRING(4), notNull: true, default: ""},
        numExp: {type: DataTypes.STRING(32), notNull: true, default: ""},
        caseInfo: {type: DataTypes.STRING(1500), notNull: true, default: ""},
        page: {type: DataTypes.SMALLINT.UNSIGNED, notNull: true, default: 0}
    }, {sequelize, modelName: 'cases', createdAt: true});

    sequelize.sync({});
};

class dataStore {

    /**
     * Get issue list
     * @param issue_date
     * @param options
     * @returns {*}
     */
    static getIssues(issue_date, options) {
        let defaultOpts = { where: {}, limit: 20, offset: 0};
        options = _.extend({}, defaultOpts, options);
        if (issue_date) {
            options.where['issueDate'] = {[Op.eq]: issue_date };
        }

        return Issues.findAll(options);
    }

    /**
     * Get cases addEventListener
     * @param params
     * @returns {*}
     */
    static getCases(params) {
        let conditions = {};
        Object.keys(params).forEach(field => {
            if (! (field in Cases.rawAttributes)) {
                return false;
            }
            conditions[ field ] = { [Op.eq]: params[ field ] };
        });

        return Cases.findAll({ where: conditions});
    }

    /**
     * Check if issue has exists
     * @param fileSign
     * @returns {Promise<GroupedCountResultItem[]>}
     * @constructor
     */
    static IssueHasExists(fileSign) {
        return Cases.count({where: {fileSign: {[Op.eq]: fileSign}}});
    }

    /**
     * Create Issue
     * @param fileSign
     * @param fileUrl
     * @param issueDate
     * @returns {Promise<CreateOptions<Attributes<Model>> extends ({returning: false} | {ignoreDuplicates: true}) ? void : Issues>}
     */
    static createIssue(fileSign, fileUrl, issueDate) {
        return Issues.create({fileSign: fileSign, fileUrl: fileUrl, issueDate: issueDate});
    }

    /**
     * Batch task: create cases
     * @param items
     * @param options
     * @returns {Promise<Cases[]>}
     */
    static bulkCreateIssues(items, options) {
        options = options || {};

        if (items.length <= 500) {
            return Cases.bulkCreate(items, options)
        }

        return _.chunk(items, 500)
            .map(chunk => Cases.bulkCreate(chunk, options));
    }
}

databaseInitialize();

module.exports = dataStore;