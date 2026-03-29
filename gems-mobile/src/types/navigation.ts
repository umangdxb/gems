export type RootStackParamList = {
  Login: undefined;
  OrderList: undefined;
  OrderDetail: { orderId: string };
  Completion: { orderNumber: string; epcisGeneratedAt: string };
};
