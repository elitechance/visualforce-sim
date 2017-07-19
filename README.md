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
$ SF_USERNAME=<username> SF_PASSWORD=<password> SF_INSTANCE=<instance url> PORT=4000 visualforce-sim -l
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
