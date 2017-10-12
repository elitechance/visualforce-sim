# visualforce-sim
Visualforce simulator

#### Installation
```bash
$ npm install -g visualforce-sim
```

#### Running the simulator using default port 3000
```bash
$ cd <web application project>
$ visualforce-sim
```

#### Running the simulator using custom port (4000)
```bash
$ cd <web application project>
$ PORT=4000 visualforce-sim
```

#### Running the simulator to use live @RemoteAction methods
If SF_INSTANCE is not set, it will use https://login.salesforce.com 
```bash
$ cd <web application project>
$ export SF_USERNAME=<username>
$ export SF_PASSWORD=<password>
$ export SF_INSTANCE=<instance url>
$ visualforce-sim -l
```

#### Auto reload browser when editing files in `<web application project>`
```bash
$ cd <web application project>
$ visualforce-sim -w
```

#### Custom filter
If you want to show the default filter being passed in executeAnonymous
```bash
$ visualforce-sim -s
```
If you want set your custom filter
```bash
$ visualforce-sim -f filter.txt
```

#### Show command line usage
```bash
$ visualforce-sim --help
```


#### Sample remoting for mocked Apex classes
Right now visualforce-sim javascript client requires jQuery
```html
<script src="https://code.jquery.com/jquery-2.2.4.min.js"></script>
<script src="node_modules/visualforce-sim/visualforce-sim-client.js"></script>
<script>
    function callback(data) {
        console.log(data); // Output will be [{name:"One",value:1},{name:"Two",value:2}]
    }
    Visualforce.remoting.Manager.invokeAction('ApexController.getList', callback, {escape:true});
</script>
```

Create a class in `<web application project>`/apex-remote/ApexController.js
```javascript
var ApexController = (function () {
    function ApexController() {
    }
    
    ApexController.prototype.getList = function () {
        return [
            {name:"One", value:1},
            {name:"Two", value:2}
        ];
    };
    return ApexController;
}());
exports.default = ApexController;
```

#### Setting custom api base path
```html
<script>
    ...
    Visualforce.remoting.Manager.serverApiBasePath = 'http://localhost:4000';
</script>
```