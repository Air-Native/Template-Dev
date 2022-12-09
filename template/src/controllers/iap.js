/* eslint-disable */
import * as RNIap from 'react-native-iap';
import { Platform, Linking } from 'react-native';

const connect = () => {
	RNIap.initConnection();
};

const disconnect = () => {
	RNIap.endConnection();
};

const getPurchaseObject = (sku, subscription) => {
	if (Platform.OS === 'ios') return { sku: sku.trim() };

	return {
		sku: sku.trim(),
		subscriptionOffers: [
			{
				sku: sku.trim(),
				offerToken: subscription.subscriptionOfferDetails[0].offerToken,
			},
		],
	};
};

const purchaseSubscription = async (sku) => {
	const listOfSubscriptions = await RNIap.getSubscriptions({
		skus: [sku.trim()],
	});
	if (!listOfSubscriptions || !listOfSubscriptions.length)
		throw new Error('This subscription not found');

	const purchaseObject = getPurchaseObject(sku, listOfSubscriptions.shift());
	RNIap.requestSubscription(purchaseObject);
};

const purchaseProduct = async (sku) => {
	const listOfProducts = await RNIap.getProducts({ skus: [sku.trim()] });
	if (!listOfProducts || !listOfProducts.length)
		throw new Error('This subscription not found');

	RNIap.requestPurchase({ sku: sku.trim() });
};

const requestPurchase = async (sku, isSubscription) => {
	return await new Promise((resolve, reject) => {
		const listener = RNIap.purchaseUpdatedListener((event) => {
			listener.remove();
			if (!event.transactionId) {
				console.error('Transaction failed');
				reject('Transaction failed');
			}

			resolve(event);
		});

		try {
			if (isSubscription) purchaseSubscription(sku);
			else purchaseProduct(sku);
		} catch (error) {
			listener.remove();
			console.error('requestPurchase error: ', error);
			reject('Purchase error: ' + error.message);
		}
	});
};

const restore = (package_name, product_id) => {
    if (Platform.OS === 'android') RNIap.deepLinkToSubscriptionsAndroid({sku: product_id})
    if (Platform.OS === 'ios') Linking.openURL('https://apps.apple.com/account/subscriptions');
}

const findPurchase = async (transactionId) => {
    try {
        const allPurchases = await RNIap.getAvailablePurchases()
        const filteredPurchases = allPurchases.filter(info => info.transactionId === transactionId)

        return !!filteredPurchases.length
    } catch (err) {
        console.warn('findPurchase Error', err)
        return false
    }
}

export default {
	connect,
	disconnect,
	requestPurchase,
    restore,
    findPurchase
};
