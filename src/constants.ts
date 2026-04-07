export const timeAggrOpts = ['Count', 'Sum', 'Avg', 'Min', 'Max'].map((value) => ({ label: value, value }));
export const tagAggrOpts = ['Count', 'Sum', 'Avg', 'Min', 'Max'].map((value) => ({ label: value, value }));
export const filterOperators = ['=~', '!~', '==', '!=', '>', '>=', '<', '<='].map((op) => ({ label: op, value: op }));
export const mapAggrOpts = ['Rate', 'Increase', 'Min', 'Max', 'Add', 'Sub', 'Mul', 'Div', 'Abs', 'FillConst', 'FillPrev'].map((value) => ({ label: value, value }));
