
1. Logo does not show up properly
2. In the integration show the different new mappings , and default values as per the document 
3. Process type - we will mark this field with the WarehouseProcessType and this will be an "operational" key. Any key marked as an Operational key will be required to have a master configuration setup for it so that thevalue coming in that key can determine the kind of action to be taken when creating the order. Master configuratin will have the list of operational keys. So at the time of integration upload, if a key is found in master configuration - then it will be considered as operational keuy
4. In the creation of order, the dropdown for the order type is not required . first we should detect the value from the file
5. In Mobile:
    5.1 Source, Source BIN should be scanable and can be changed