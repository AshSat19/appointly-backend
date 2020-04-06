const logger = require('../logger');

const Booking = require('../models/booking.model');
const User = require('../models/user.model');

exports.checkSlotAvailability = (req, res, next) => {
    Booking
    .findOne({
        guest: req.body.guest,
        host: req.body.guest,
        date: req.body.date,
        slot: req.body.slot
    })
    .then(existingBooking => {
        if (existingBooking) {
            logger.error({
                function: 'check_slot_availability',
                message: 'The requested slot is already taken'
            });
            return res.status(401).jsonp({
                message: 'The requested slot is already booked. Please pick a different slot.'
            });
        } else {
            logger.info({
                function: 'check_slot_availability',
                message: 'The requested slot is available'
            });
            next();
        }
    })
    .catch(error => {
        logger.error({
            function: 'check_slot_availability',
            message: 'Failed to verify slot availability' + error
        });
        return res.status(500).jsonp({
            message: 'Internal Server Error. Please try again.'
        });
    });
};

exports.resolveUserMame = (req, res, next) => {
    User
    .findOne({ email: req.body.guest })
    .then(fetchedUser => {
        req.body.guest = fetchedUser.name;
        User
        .findOne({ email: req.body.host })
        .then(fetchedUser => {
            req.body.host = fetchedUser.name;
            logger.info({
                function: 'resolve_user_name',
                message: 'The guest and host names have been resolved'
            });
            next();
        })
        .catch(error => {
            logger.error({
                function: 'resolve_user_name',
                message: 'Failed to resolve host name' + error
            });
            return res.status(500).jsonp({
                message: 'Internal Server Error. Please try again.'
            });
        });
    })
    .catch(error => {
        logger.error({
            function: 'resolve_user_name',
            message: 'Failed to resolve guest name' + error
        });
        return res.status(500).jsonp({
            message: 'Internal Server Error. Please try again.'
        });
    });
};

exports.bookAppointment = (req, res, next) => {
    const newAppointment = new Booking({
        guest: req.body.guest,
        host: req.body.host,
        date: req.body.date,
        slot: req.body.slot,
        note: req.body.note
    });

    newAppointment
    .save()
    .then(savedAppointment => {
        logger.info({
            function: 'book_appointment',
            message: 'Appointment successfully booked'
        });
        res.status(200).jsonp({
            message: 'Appointment successfully booked',
            details: savedAppointment
        });
    })
    .catch(error => {
        logger.error({
            function: 'book_appointment',
            message: 'Appointment booking failed: ' + error
        });
        res.status(500).jsonp({
            message: 'Internal server error. Please try again.'
        });
    });
};

exports.updateAppointment = (req, res, next) => {
    const updatedAppointment = new Booking({
        _id: req.params.id,
        guest: req.body.guest,
        host: req.body.host,
        date: req.body.date,
        slot: req.body.slot,
        note: req.body.note
    });

    Booking
    .updateOne({ _id: req.params.id, host: req.userData.email }, updatedAppointment)
    .then(result => {
        if (result.n > 0) {
            logger.info({
                function: 'update_appointment',
                message: 'Appointment successfully updated'
            });
            res.status(200).jsonp({ 
                message: 'Appointment updated successfuly' 
            });
        } else {
            logger.error({
                function: 'update_appointment',
                message: 'User unauthorized. Appointment update blocked'
            });
            res.status(401).jsonp({ 
                message: 'User unauthorized' 
            });
        }
    })
    .catch(error => {
        logger.error({
            function: 'update_appointment',
            message: 'Appointment update failed: ' + error
        });
        res.status(500).jsonp({
            message: 'Internal server error. Please try again.'
        });
    });
};

exports.getHostedAppointments = (req, res, next) => {
    Booking
    .find({ host: req.params.host })
    .then(appointments => {
        logger.info({
            function: 'get_hosted_appointments',
            message: 'Appointments hosted by user successfully fetched',
        });
        res.status(200).jsonp({
            message: 'Hosted appointment successfully fetched',
            hostedAppointments: appointments
        });
    })
    .catch(error => {
        logger.error({
            function: 'get_hosted_appointments',
            message: 'Fetching hosted appointments failed: ' + error
        });
        res.status(500).jsonp({
            message: 'Internal server error. Please try again.'
        });
    });
};

exports.getGuestAppointments = (req, res, next) => {
    Booking
    .find({ guest: req.params.guest })
    .then(appointments => {
        logger.info({
            function: 'get_guest_appointments',
            message: 'Appointments to be attended by user successfully fetched',
        });
        res.status(200).jsonp({
            message: 'Guest appointment successfully fetched',
            guestAppointments: appointments
        });
    })
    .catch(error => {
        logger.error({
            function: 'get_guest_appointments',
            message: 'Fetching guest appointments failed: ' + error
        });
        res.status(500).jsonp({
            message: 'Internal server error. Please try again.'
        });
    });
};

exports.getAllAppointments = (req, res, next) => {
    req.locals = {};
    Booking
    .find({ $or: [{ guest: req.params.user }, { host: req.params.user }] })
    .then(appointments => {
        const pastAppointments = [];
        const hostedAppointments = [];
        const guestAppointments = [];
        appointments.forEach(appointment => {
            const now = Date.now();
            if (new Date(appointment.date).getTime() < now) {
                pastAppointments.push(appointment);
            } else {
                if (appointment.hsot === req.userData.email) {
                    hostedAppointments.push(appointment);
                } else {
                    guestAppointments.push(appointment);
                }
            }
        });
        logger.info({
            function: 'get_all_appointments',
            message: 'All appointments of user successfully fetched'
        });
        res.status(200).jsonp({
            message: 'All appointments of user successfully fetched',
            pastAppointments,
            hostedAppointments,
            guestAppointments
        });
    })
    .catch(error => {
        logger.error({
            function: 'get_all_appointments',
            message: 'Fetching all appointments failed: ' + error
        });
        res.status(500).jsonp({
            message: 'Internal server error. Please try again.'
        });
    });
};

exports.deleteAppointment = (req, res, next) => {
    Booking.deleteOne({ _id: req.params.id, host: req.userData.email })
    .then(result => {
        if (result.n > 0) {
            logger.info({
                function: 'delete_appointment',
                message: 'Appointments successfully deleted'
            });
            res.status(200).jsonp({
                message: 'Appointment deletion successful'
            });
        } else {
            logger.error({
                function: 'delete_appointment',
                message: 'Appointments deletion blocked. User unauthorized.'
            });
            res.status(401).jsonp({
                message: 'User not authorized.Deletion blocked.'
            });
        }
    })
    .catch(error => {
        logger.error({
            function: 'delete_appointment',
            message: 'Appointments deletion failed: ' + error
        });
        res.status(500).jsonp({
            message: 'Internal server error. Please try again.'
        });
    });
};
