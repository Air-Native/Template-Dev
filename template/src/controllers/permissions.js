/* eslint-disable */
import { PermissionsAndroid } from "react-native"

const PERMISSION_LIST = {
    "location": PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    "read": PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    "camera": PermissionsAndroid.PERMISSIONS.CAMERA,
    "write": PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
}

const permissionResponse = (currentPermissionStatus, reason) => {
    return {
        currentPermissionStatus,
        reason
    }
}

const requestPermission = async (permissionName) => {
    try {
        if (!PERMISSION_LIST[permissionName]) throw new Error("This permission can't be requested")
        const currentPermissionStatus = await PermissionsAndroid.check(PERMISSION_LIST[permissionName])

        if (currentPermissionStatus) return permissionResponse(currentPermissionStatus, 'denied')

        const response = await PermissionsAndroid.request(PERMISSION_LIST[permissionName]);
        return permissionResponse(currentPermissionStatus, response)
    } catch (err) {
        Alert.alert('Get permission error: ', error.message);
    }
}

const requestAllPermissions = async () => {
    for (const permissionName of Object.keys(PERMISSION_LIST)){
        await requestPermission(permissionName)
    }
}

export default {
    requestPermission,
    requestAllPermissions
}