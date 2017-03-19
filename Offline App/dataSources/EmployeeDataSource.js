(function ($) {
    EmployeeDataSource = OfflineJSDODataSource.extend({
        options: {
             name: 'WorkerObject',
            schema: {
                model: {
                    fields: {
                        'Text': {
                            field: 'Text',
                            defaultValue: ''
                        },
                    }
                }
            },
        }
    });
})(jQuery);