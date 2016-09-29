//  ██╗   ██╗██████╗ ██████╗  █████╗ ████████╗███████╗     █████╗  ██████╗████████╗██╗ ██████╗ ███╗   ██╗
//  ██║   ██║██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔════╝    ██╔══██╗██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║
//  ██║   ██║██████╔╝██║  ██║███████║   ██║   █████╗      ███████║██║        ██║   ██║██║   ██║██╔██╗ ██║
//  ██║   ██║██╔═══╝ ██║  ██║██╔══██║   ██║   ██╔══╝      ██╔══██║██║        ██║   ██║██║   ██║██║╚██╗██║
//  ╚██████╔╝██║     ██████╔╝██║  ██║   ██║   ███████╗    ██║  ██║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║
//   ╚═════╝ ╚═╝     ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝    ╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
//

module.exports = require('machine').build({


  friendlyName: 'Update',


  description: 'Update record(s) in the database based on a query criteria.',


  inputs: {

    datastore: {
      description: 'The datastore to use for connections.',
      extendedDescription: 'Datastores represent the config and manager required to obtain an active database connection.',
      required: true,
      readOnly: true,
      example: '==='
    },

    tableName: {
      description: 'The name of the table to search for records to update in.',
      required: true,
      example: 'users'
    },

    criteria: {
      description: 'The Waterline criteria object to use for the query.',
      required: true,
      example: {}
    },

    values: {
      description: 'The values to set on the matching records.',
      required: true,
      readOnly: true,
      example: '==='
    }

  },


  exits: {

    success: {
      description: 'The records were successfully updated.',
      outputVariableName: 'records',
      example: {
        records: [{}]
      }
    },

    invalidDatastore: {
      description: 'The datastore used is invalid. It is missing key pieces.'
    },

    badConnection: {
      friendlyName: 'Bad connection',
      description: 'A connection either could not be obtained or there was an error using the connection.'
    }

  },


  fn: function update(inputs, exits) {
    var _ = require('lodash');
    var PG = require('machinepack-postgresql');
    var Converter = require('machinepack-waterline-query-converter');
    var Helpers = require('./private');


    // Ensure that a model can be found on the datastore.
    var model = inputs.datastore.models && inputs.datastore.models[inputs.tableName];
    if (!model) {
      return exits.invalidDatastore();
    }

    // Default the postgres schemaName to "public"
    var schemaName = 'public';

    // Check if a schemaName was manually defined
    if (model.meta && model.meta.schemaName) {
      schemaName = model.meta.schemaName;
    }


    //  ╔═╗╔═╗╔╗╔╦  ╦╔═╗╦═╗╔╦╗  ┌┬┐┌─┐  ┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┐┌┌┬┐
    //  ║  ║ ║║║║╚╗╔╝║╣ ╠╦╝ ║    │ │ │  └─┐ │ ├─┤ │ ├┤ │││├┤ │││ │
    //  ╚═╝╚═╝╝╚╝ ╚╝ ╚═╝╩╚═ ╩    ┴ └─┘  └─┘ ┴ ┴ ┴ ┴ └─┘┴ ┴└─┘┘└┘ ┴
    // Convert the Waterline criteria into a Waterline Query Statement. This
    // turns it into something that is declarative and can be easily used to
    // build a SQL query.
    // See: https://github.com/treelinehq/waterline-query-docs for more info
    // on Waterline Query Statements.
    var updateStatement;
    try {
      updateStatement = Converter.convert({
        model: inputs.tableName,
        method: 'update',
        criteria: inputs.criteria,
        values: inputs.values
      }).execSync();
    } catch (e) {
      return exits.error(e);
    }

    // Generate a FIND statement as well that will get all the records being updated.
    var findStatement;
    try {
      findStatement = Converter.convert({
        model: inputs.tableName,
        method: 'find',
        criteria: inputs.criteria
      }).execSync();
    } catch (e) {
      return exits.error(e);
    }


    //  ███╗   ██╗ █████╗ ███╗   ███╗███████╗██████╗
    //  ████╗  ██║██╔══██╗████╗ ████║██╔════╝██╔══██╗
    //  ██╔██╗ ██║███████║██╔████╔██║█████╗  ██║  ██║
    //  ██║╚██╗██║██╔══██║██║╚██╔╝██║██╔══╝  ██║  ██║
    //  ██║ ╚████║██║  ██║██║ ╚═╝ ██║███████╗██████╔╝
    //  ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚═════╝
    //
    //  ███████╗██╗   ██╗███╗   ██╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗███████╗
    //  ██╔════╝██║   ██║████╗  ██║██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
    //  █████╗  ██║   ██║██╔██╗ ██║██║        ██║   ██║██║   ██║██╔██╗ ██║███████╗
    //  ██╔══╝  ██║   ██║██║╚██╗██║██║        ██║   ██║██║   ██║██║╚██╗██║╚════██║
    //  ██║     ╚██████╔╝██║ ╚████║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║███████║
    //  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
    //
    // Prevent Callback Hell and such.


    //  ╔═╗╔═╗╔╦╗╔═╗╦╦  ╔═╗  ┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┐┌┌┬┐
    //  ║  ║ ║║║║╠═╝║║  ║╣   └─┐ │ ├─┤ │ ├┤ │││├┤ │││ │
    //  ╚═╝╚═╝╩ ╩╩  ╩╩═╝╚═╝  └─┘ ┴ ┴ ┴ ┴ └─┘┴ ┴└─┘┘└┘ ┴
    // Transform the Waterline Query Statement into a SQL query.
    var compileStatement = function compileStatement(statement, done) {
      PG.compileStatement({
        statement: statement
      })
      .exec({
        error: function error(err) {
          return done(err);
        },
        success: function success(report) {
          return done(null, report.nativeQuery);
        }
      });
    };


    //  ╔═╗╔═╗╔═╗╦ ╦╔╗╔  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //  ╚═╗╠═╝╠═╣║║║║║║  │  │ │││││││├┤ │   │ ││ ││││
    //  ╚═╝╩  ╩ ╩╚╩╝╝╚╝  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘
    var spawnConnection = function spawnConnection(done) {
      Helpers.spawnConnection({
        datastore: inputs.datastore
      })
      .exec({
        error: function error(err) {
          return done(err);
        },
        success: function success(connection) {
          return done(null, connection);
        }
      });
    };


    //  ╔╗ ╔═╗╔═╗╦╔╗╔  ┌┬┐┬─┐┌─┐┌┐┌┌─┐┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //  ╠╩╗║╣ ║ ╦║║║║   │ ├┬┘├─┤│││└─┐├─┤│   │ ││ ││││
    //  ╚═╝╚═╝╚═╝╩╝╚╝   ┴ ┴└─┴ ┴┘└┘└─┘┴ ┴└─┘ ┴ ┴└─┘┘└┘
    var beginTransaction = function beginTransaction(connection, done) {
      PG.beginTransaction({
        connection: connection
      })
      .exec({
        // If there was an error opening a transaction, release the connection.
        // After releasing the connection always return the original error.
        error: function error(err) {
          PG.releaseConnection({
            connection: connection
          }).exec({
            error: function error() {
              return done(err);
            },
            success: function success() {
              return done(err);
            }
          });
        },
        success: function success() {
          return done();
        }
      });
    };


    //  ╔═╗╔═╗╔═╗╦ ╦╔╗╔  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //  ╚═╗╠═╝╠═╣║║║║║║  │  │ │││││││├┤ │   │ ││ ││││
    //  ╚═╝╩  ╩ ╩╚╩╝╝╚╝  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘
    //   ┬   ╔═╗╔╦╗╔═╗╦═╗╔╦╗  ┌┬┐┬─┐┌─┐┌┐┌┌─┐┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //  ┌┼─  ╚═╗ ║ ╠═╣╠╦╝ ║    │ ├┬┘├─┤│││└─┐├─┤│   │ ││ ││││
    //  └┘   ╚═╝ ╩ ╩ ╩╩╚═ ╩    ┴ ┴└─┴ ┴┘└┘└─┘┴ ┴└─┘ ┴ ┴└─┘┘└┘
    var spawnTransaction = function spawnTransaction(done) {
      spawnConnection(function cb(err, connection) {
        if (err) {
          return done(err);
        }

        beginTransaction(connection, function cb(err) {
          if (err) {
            return done(err);
          }

          return done(null, connection);
        });
      });
    };


    //  ╔═╗╦╔╗╔╔╦╗  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐  ┌┬┐┌─┐  ┬ ┬┌─┐┌┬┐┌─┐┌┬┐┌─┐
    //  ╠╣ ║║║║ ║║  ├┬┘├┤ │  │ │├┬┘ ││└─┐   │ │ │  │ │├─┘ ││├─┤ │ ├┤
    //  ╚  ╩╝╚╝═╩╝  ┴└─└─┘└─┘└─┘┴└──┴┘└─┘   ┴ └─┘  └─┘┴  ─┴┘┴ ┴ ┴ └─┘
    var runFindQuery = function runFindQuery(connection, query, done) {
      Helpers.runQuery({
        connection: connection,
        nativeQuery: query,
        queryType: 'select',
        disconnectOnError: false
      })
      .exec({
        // Rollback the transaction and release the connection on error.
        error: function error(err) {
          Helpers.rollbackAndRelease({
            connection: connection
          }).exec({
            error: function error() {
              return done(err);
            },
            success: function success() {
              return done(err);
            }
          });
        },
        success: function success(report) {
          return done(null, report.result);
        }
      });
    };


    //  ╦═╗╦ ╦╔╗╔  ┬ ┬┌─┐┌┬┐┌─┐┌┬┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╦╝║ ║║║║  │ │├─┘ ││├─┤ │ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╩╚═╚═╝╝╚╝  └─┘┴  ─┴┘┴ ┴ ┴ └─┘  └─┘└└─┘└─┘┴└─ ┴
    var runUpdateQuery = function runUpdateQuery(connection, query, done) {
      Helpers.runQuery({
        connection: connection,
        nativeQuery: query,
        queryType: 'update',
        disconnectOnError: false
      })
      .exec({
        // Rollback the transaction and release the connection on error.
        error: function error(err) {
          Helpers.rollbackAndRelease({
            connection: connection
          }).exec({
            error: function error() {
              return done(err);
            },
            success: function success() {
              return done(err);
            }
          });
        },
        success: function success(report) {
          return done(null, report.result);
        }
      });
    };


    //  ╔═╗╦╔╗╔╔╦╗  ┬ ┬┌─┐┌┬┐┌─┐┌┬┐┌─┐  ┬─┐┌─┐┌─┐┬ ┬┬ ┌┬┐┌─┐
    //  ╠╣ ║║║║ ║║  │ │├─┘ ││├─┤ │ ├┤   ├┬┘├┤ └─┐│ ││  │ └─┐
    //  ╚  ╩╝╚╝═╩╝  └─┘┴  ─┴┘┴ ┴ ┴ └─┘  ┴└─└─┘└─┘└─┘┴─┘┴ └─┘
    var findUpdateResults = function findUpdateResults(connection, findResults, done) {
      // Find the Primary Key field in the model
      var primaryKey;
      try {
        primaryKey = Helpers.findPrimaryKey({
          model: model
        }).execSync();
      } catch (e) {
        return done(new Error('Error determining Primary Key to use.'));
      }

      // Grab the values of the Primary key from each record
      var values = _.pluck(findResults, primaryKey);

      // Build up a criteria statement to run
      var criteriaStatement = {
        select: ['*'],
        from: inputs.tableName,
        where: {}
      };

      // Insert dynamic primary key value into query
      criteriaStatement.where[primaryKey] = {
        in: values
      };

      // Build an IN query from the results of the find query
      PG.compileStatement({
        statement: criteriaStatement
      }).exec({
        error: function error(err) {
          return done(err);
        },
        success: function success(report) {
          // Run the FIND query
          Helpers.runQuery({
            connection: connection,
            nativeQuery: report.nativeQuery,
            queryType: 'select',
            disconnectOnError: false
          }).exec({
            // Rollback the transaction and release the connection on error.
            error: function error(err) {
              Helpers.rollbackAndRelease({
                connection: connection
              }).exec({
                error: function error() {
                  return done(err);
                },
                success: function success() {
                  return done(err);
                }
              });
            },
            success: function success(report) {
              return done(null, report.result);
            }
          });
        }
      });
    };


    //  ╦ ╦╔═╗╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┌┐┌┌┬┐  ┌─┐┬┌┐┌┌┬┐
    //  ║ ║╠═╝ ║║╠═╣ ║ ║╣   ├─┤│││ ││  ├┤ ││││ ││
    //  ╚═╝╩  ═╩╝╩ ╩ ╩ ╚═╝  ┴ ┴┘└┘─┴┘  └  ┴┘└┘─┴┘
    // Currently the query builder doesn't have support for using Postgres
    // "returning *" clauses. To get around this, first a query using the given
    // criteria is ran and the results from that are used to build up an "IN"
    // query using the primary key of the table. Then the update query is ran and
    // then the built query is ran to get the results of the update.
    var updateAndFind = function updateAndFind(connection, done) {
      // Compile the FIND statement
      compileStatement(findStatement, function cb(err, findQuery) {
        if (err) {
          return done(err);
        }

        // Run the initial FIND query
        runFindQuery(connection, findQuery, function cb(err, findResults) {
          if (err) {
            return done(err);
          }

          // Compile the UPDATE statement
          compileStatement(updateStatement, function cb(err, updateQuery) {
            if (err) {
              return done(err);
            }

            // Run the UPDATE query
            runUpdateQuery(connection, updateQuery, function cb(err) {
              if (err) {
                return done(err);
              }

              // Use the results from the FIND query to get the updates records
              findUpdateResults(connection, findResults, function cb(err, queryResults) {
                if (err) {
                  return done(err);
                }

                return done(null, queryResults);
              });
            });
          });
        });
      });
    };


    //  ╔═╗╔═╗╔╦╗╔╦╗╦╔╦╗  ┌┬┐┬─┐┌─┐┌┐┌┌─┐┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //  ║  ║ ║║║║║║║║ ║    │ ├┬┘├─┤│││└─┐├─┤│   │ ││ ││││
    //  ╚═╝╚═╝╩ ╩╩ ╩╩ ╩    ┴ ┴└─┴ ┴┘└┘└─┘┴ ┴└─┘ ┴ ┴└─┘┘└┘
    // Commit the transaction and release the connection.
    var commitTransaction = function commitTransaction(connection, done) {
      Helpers.commitAndRelease({
        connection: connection
      })
      .exec({
        error: function error(err) {
          return done(err);
        },
        success: function success() {
          return done();
        }
      });
    };


    //   █████╗  ██████╗████████╗██╗ ██████╗ ███╗   ██╗
    //  ██╔══██╗██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║
    //  ███████║██║        ██║   ██║██║   ██║██╔██╗ ██║
    //  ██╔══██║██║        ██║   ██║██║   ██║██║╚██╗██║
    //  ██║  ██║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║
    //  ╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
    //
    //  ██╗      ██████╗  ██████╗ ██╗ ██████╗
    //  ██║     ██╔═══██╗██╔════╝ ██║██╔════╝
    //  ██║     ██║   ██║██║  ███╗██║██║
    //  ██║     ██║   ██║██║   ██║██║██║
    //  ███████╗╚██████╔╝╚██████╔╝██║╚██████╗
    //  ╚══════╝ ╚═════╝  ╚═════╝ ╚═╝ ╚═════╝
    //


    // Spawn a new connection and open a transaction for running queries on.
    spawnTransaction(function cb(err, connection) {
      if (err) {
        return exits.badConnection(err);
      }

      // Process the Update
      updateAndFind(connection, function cb(err, updatedRecords) {
        if (err) {
          return exits.badConnection(err);
        }

        // Commit the transaction
        commitTransaction(connection, function cb(err) {
          if (err) {
            return exits.error(err);
          }

          //  ╔═╗╔═╗╔═╗╔╦╗  ┬  ┬┌─┐┬  ┬ ┬┌─┐┌─┐
          //  ║  ╠═╣╚═╗ ║   └┐┌┘├─┤│  │ │├┤ └─┐
          //  ╚═╝╩ ╩╚═╝ ╩    └┘ ┴ ┴┴─┘└─┘└─┘└─┘
          var castResults = Helpers.normalizeValues({
            schema: model.dbSchema,
            records: updatedRecords
          }).execSync();

          return exits.success({ records: castResults });
        }); // </ .commitTransaction(); >
      }); // </ .updateAndFind(); >
    }); // </ .spawnTransaction(); >
  }

});
