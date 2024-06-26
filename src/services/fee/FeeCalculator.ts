import {
  ChronoUnit,
  DayOfWeek,
  LocalDate,
  LocalDateTime,
  LocalTime,
} from "@js-joda/core";
import { CalculateDaysResult, CarPark, VEHICLE_TYPE } from "../../types";
import { parseTimeString } from "../../utils";

export class FeeCalculator {
  checkGracePeriod = (
    startTime: string,
    endTime: string,
    gracePeriodInMinutes: number
  ): boolean => {
    const parsedStartTime = LocalDateTime.parse(startTime);
    const parsedEndTime = LocalDateTime.parse(endTime);
    const timeDiff = parsedStartTime.until(parsedEndTime, ChronoUnit.MINUTES);
    return timeDiff <= gracePeriodInMinutes;
  };

  checkIsSameDay = (startDateTime: string, endDateTime: string): boolean => {
    const parseStartDateTime = new Date(startDateTime);
    const parseEndDateTime = new Date(endDateTime);
    return (
      new Date(
        parseStartDateTime.getFullYear(),
        parseStartDateTime.getMonth(),
        parseStartDateTime.getDate()
      ).getTime() ===
      new Date(
        parseEndDateTime.getFullYear(),
        parseEndDateTime.getMonth(),
        parseEndDateTime.getDate()
      ).getTime()
    );
  };

  checkIsWeekend = (date: LocalDate): boolean => {
    return (
      date.dayOfWeek() == DayOfWeek.SATURDAY ||
      date.dayOfWeek() == DayOfWeek.SUNDAY
    );
  };

  calculateDays = (
    startDateTime: string,
    endDateTime: string
  ): CalculateDaysResult[] => {
    const parseStartDateTime = LocalDateTime.parse(startDateTime);
    const parseEndDateTime = LocalDateTime.parse(endDateTime);
    const result = [] as CalculateDaysResult[];

    let currentDate = parseStartDateTime.toLocalDate();
    let currentStartTime = parseStartDateTime.toLocalTime();
    let currentEndTime = parseEndDateTime.toLocalTime();
    if (this.checkIsSameDay(startDateTime, endDateTime)) {
      return [
        {
          dayStartTime: currentStartTime,
          dayEndTime: currentEndTime,
          isWeekendOrPH: this.checkIsWeekend(parseStartDateTime.toLocalDate()),
        },
      ];
    }

    do {
      result.push({
        dayStartTime: currentStartTime,
        dayEndTime: LocalTime.of(23, 59),
        isWeekendOrPH: this.checkIsWeekend(currentDate),
      });

      currentDate = currentDate.plusDays(1);
      currentStartTime = LocalTime.of(0, 0);
      currentEndTime = LocalTime.of(23, 59);
    } while (currentDate.isBefore(parseEndDateTime.toLocalDate()));
    result.push({
      dayStartTime: LocalTime.of(0, 0),
      dayEndTime: parseEndDateTime.toLocalTime(),
      isWeekendOrPH: this.checkIsWeekend(currentDate),
    });

    return result;
  };

  calculateParkingFee = (
    startTime: string,
    endTime: string,
    carpark: CarPark,
    vehicleType: VEHICLE_TYPE = VEHICLE_TYPE.CAR
  ): number => {
    let totalFee = 0;
    if (
      this.checkGracePeriod(startTime, endTime, carpark.gracePeriodInMinutes)
    ) {
      return 0;
    }
    const days = this.calculateDays(startTime, endTime);
    console.log("days", days);
    days.forEach((day) => {
      if (day.isWeekendOrPH) {
        const weekendPHFeeRules =
          vehicleType === VEHICLE_TYPE.CAR
            ? carpark.carFee.weekendPHFeeRules
            : carpark.motocycleFee.feeRules;
        weekendPHFeeRules.forEach((rule) => {
          const isFitResult = rule.isFit(day.dayStartTime, day.dayEndTime);
          if (isFitResult.isFit) {
            const fee = rule.calculateCost(isFitResult);
            console.log("rule", rule, "fee", fee);
            totalFee += fee;
          }
        });
      } else {
        const weekdayFeeRules =
          vehicleType === VEHICLE_TYPE.CAR
            ? carpark.carFee.weekdayFeeRules
            : carpark.motocycleFee.feeRules;
        weekdayFeeRules.forEach((rule) => {
          const isFitResult = rule.isFit(day.dayStartTime, day.dayEndTime);
          if (isFitResult.isFit) {
            totalFee += rule.calculateCost(isFitResult);
          }
        });
      }
    });
    return parseFloat(totalFee.toFixed(2));
  };
}
