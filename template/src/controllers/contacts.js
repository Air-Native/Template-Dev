/* eslint-disable */
import Contacts from 'react-native-contacts';

const nativeContactToBubbleObject = (contact) => {
    return {
        _p_familyName: contact.familyName,
        _p_givenName: contact.givenName,
        _p_middleName: contact.middleName,
        _p_firstNumber:
          contact.phoneNumbers[0] !== undefined
            ? contact.phoneNumbers[0].number
            : '',
        _p_secondNumber:
          contact.phoneNumbers[1] !== undefined
            ? contact.phoneNumbers[1].number
            : '',
        _p_thirdNumber:
          contact.phoneNumbers[2] !== undefined
            ? contact.phoneNumbers[2].number
            : '',
        _p_birthday:
          contact.birthday !== null && contact.birthday !== undefined
            ? new Date(
                contact.birthday.year,
                contact.birthday.month,
                contact.birthday.day,
              )
            : null,
        _p_emailAddress:
          contact.emailAddresses[0] !== undefined
            ? contact.emailAddresses[0].email
            : '',
      };
}

const requestPermission = async () => {
    await Contacts.requestPermission()
    return await checkPermission()
}

const checkPermission = async () => {
    const status = await Contacts.checkPermission()
    if (status === 'undefined') return await requestPermission()
    if (status === 'authorized') return true
    if (status === 'denied') return false
}

const getContacts = async () => {
    try {
        const canAccess = await checkPermission()
        if (!canAccess) return 'Permission to contacts denied!'

        const contacts = await Contacts.getAll()

        return contacts.map(nativeContactToBubbleObject)

    } catch (err) {
        console.error(err)
    }
}

export default {
    getContacts
}