var items = [
    {"Id": "1", "Name": "abc", "Parent": "2"},
    {"Id": "2", "Name": "abc", "Parent": ""},
    {"Id": "3", "Name": "abc", "Parent": "5"},
    {"Id": "4", "Name": "abc", "Parent": "2"},
    {"Id": "5", "Name": "abc", "Parent": ""},
    {"Id": "6", "Name": "abc", "Parent": "2"},
    {"Id": "7", "Name": "abc", "Parent": "6"},
    {"Id": "8", "Name": "abc", "Parent": "6"}
];

var buildHierarchy = function(arry) {

    var roots = [], children = {};

    // find the top level nodes and hash the children based on parent
    for (var i = 0, len = arry.length; i < len; ++i) {
        var item = arry[i],
            p = item.Parent,
            target = !p ? roots : (children[p] || (children[p] = []));

        target.push({ value: item });
    }

    // function to recursively build the tree
    var findChildren = function(parent) {
        if (children[parent.value.Id]) {
            parent.children = children[parent.value.Id];
            for (var i = 0, len = parent.children.length; i < len; ++i) {
                findChildren(parent.children[i]);
            }
        }
    };

    // enumerate through to handle the case where there are multiple roots
    for (var i = 0, len = roots.length; i < len; ++i) {
        findChildren(roots[i]);
    }

    return roots;
};

console.log(buildHierarchy(items));
