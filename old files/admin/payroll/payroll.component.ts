import { Component, OnInit } from '@angular/core';
import { SharedGlobalService } from '../../@core/services/shared.global.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CreatePayrollComponent } from '../modals/create-payroll/create-payroll.component';
import { PayslipComponent } from '../modals/payslip/payslip.component';
import { PrintPayslipComponent } from '../modals/print-payslip/print-payslip.component';
import { EditPayslipComponent } from '../modals/edit-payslip/edit-payslip.component';
import { ActivatedRoute } from '@angular/router';
import { AddAllowanceComponent } from '../modals/add-allowance/add-allowance.component';
import * as moment from 'moment';
import { ReverseDate } from '../../@core/pipes/dataFilter';

@Component({
	selector: 'ngx-payroll',
	templateUrl: './payroll.component.html',
	styleUrls: ['./payroll.component.scss'],
})
export class PayrollComponent implements OnInit {
	public bsValue = new Date();
	public filterQuery = '';
	public sortBy = 'id';
	public sortOrder = 'asc';
	public selectQueryString = 'Name';
	public selectQuery = 'name';
	public data;
	public employee;
	public loading = true;
	public date = new Date();
	public todate;
	public socketInstance;
	public socketInstanceForLoans;
	public activePayroll;
	public socketInstancePrinted: any;
	public alltotalOT = 0;
	public promptOT = 0;
	public PastovertimeIDs = [];
	public overtimeIDs = [];

	constructor(public sgs: SharedGlobalService, public ngbModal: NgbModal, public route: ActivatedRoute, public rd: ReverseDate) {
		this.socketInstance = sgs.ResponseSocket('newPayslip').subscribe((emitted) => {
			this.getActivePayroll();
		});
		this.socketInstanceForLoans = sgs.ResponseSocket('loans').subscribe((emitted) => {
			this.getActivePayroll();
		});
		this.socketInstancePrinted = sgs.ResponseSocket('printed').subscribe((emitted) => {
			this.getActivePayroll();
		});
		this.socketInstance = sgs.ResponseSocket('payroll').subscribe((emitted) => {
			this.getActivePayroll();
		});
	}

	ngOnInit() {
		this.getAllUsers();
		this.getActivePayroll();
	}

	ngOnDestroy() {
		this.socketInstance.unsubscribe();
		this.socketInstanceForLoans.unsubscribe();
	}

	// get active or newly created payroll
	getActivePayroll() {
		this.sgs.request('get', 'payroll/getSelectedPayroll', { id: this.route.snapshot.params['id'] }, async (res) => {
			if (res.success) {
				this.activePayroll = res.data;
				console.log(this.activePayroll);
				[
					this.activePayroll.status === 5 &&
						this.sgs.showToaster(
							'warning',
							'Nothing to do here other than view the paylip \n if already printed other than that..\n nothing to show',
							'This is Closed and Paid Payroll',
							8000,
							'top-right'
						),
				];
			}
		});
	}

	getAllUsers() {
		// medrep is excluded
		this.sgs.request('get', 'user/getAllUsersWithProfile', {}, async (res) => {
			if (res.success) {
				this.data = res.data;
				this.loading = false;
				console.log(this.data);
			} else {
				this.data = [];
				this.loading = false;
			}
		});
	}

	selectFilter(name, value) {
		this.selectQuery = name;
		this.selectQueryString = value;
	}

	createPayroll() {
		const activeModal = this.ngbModal.open(CreatePayrollComponent, {
			size: 'lg',
			container: 'nb-layout',
			windowClass: 'min_height',
			backdrop: 'static',
		});
		activeModal.componentInstance.status = 1;
		activeModal.componentInstance.pid = this.activePayroll.id;
	}

	payslip(id) {
		//THIS IS A SOLUTION FOR INCRMEENTING ISSUES IF PROMTP IS CLOSE AND OPEN AND CLOSE AGAIN THE TOTAL IS JUST INCREMENTING
		this.alltotalOT = 0;
		////////////////////////////////////////////////////////////////

		//this is to open the modal
		let sendData = async () => {
			const activeModal = this.ngbModal.open(PayslipComponent, {
				size: 'lg',
				container: 'nb-layout',
				windowClass: 'min_height',
				backdrop: 'static',
			});
			return [
				activeModal,
				(activeModal.componentInstance.eid = id),
				(activeModal.componentInstance.PastOT = PastOT),
				(activeModal.componentInstance.overtimeIDs = this.overtimeIDs),
				(activeModal.componentInstance.PastovertimeIDs = this.PastovertimeIDs),
				(activeModal.componentInstance.approvedOT = this.alltotalOT),
				(activeModal.componentInstance.cutOffFrom = this.activePayroll.cutOffFrom),
				(activeModal.componentInstance.cutOffTo = this.activePayroll.cutOffTo),
				(activeModal.componentInstance.pid = this.activePayroll.id),
			];
		};

		let PastOT = 0;
		console.log(id);
		console.log(this.activePayroll.summary.length);
		console.log(this.activePayroll.summary);

		//NO PAYSLIP IS GENERATED FOR THIS CUT OFF
		if (this.activePayroll.summary.length === 0) {
			let OtherOT = [];
			let OTaddORnot: Boolean;

			//CHEK ALL APPROVED OVERTIME REQUEST FOR THIS EMPLOYEE
			this.sgs.request('get', 'overtime/getAllOvertime', { id: id }, async (response) => {
				console.log('Past or Future OT found');
				console.log(response.data);
				console.log(response.data.length);
				console.log(response.success);

				//QUERY SUCCESS getAllOvertime WITH ID ONLY
				if (response.success) {
					//FOUND A REQUEST FOR THE EMPLOYEE
					if (response.data.length !== 0) {
						console.log('FOUND A REQUEST FOR THE EMPLOYEE');
						console.log(response.data);
						console.log(response.data.length);

						//SEPARATE THIS CUT OFF AND OTHER CUT OFF FOUND FOR THIS EMPLOYEE
						await response.data.filter((e) => {
							//THIS IS FOR OTHER CUT OFF
							if (e.payroll_id !== this.activePayroll.id) {
								var start = moment(new Date(this.rd.transform(e.start)));
								var end = moment(new Date(this.rd.transform(e.end)));
								var duration = moment.duration(start.diff(end));
								var minutes = duration.asMinutes();
								var totals = Math.abs(Math.round(minutes));
								totals /= 60;
								e.minTotal = totals;
								PastOT += totals;
								this.PastovertimeIDs.push(e.id);
								OtherOT.push(e);
								//THIS IS FOR THE CURRENT CUT OFF
							} else {
								var start = moment(new Date(this.rd.transform(e.start)));
								var end = moment(new Date(this.rd.transform(e.end)));
								var duration = moment.duration(start.diff(end));
								var minutes = duration.asMinutes();
								var totals = Math.abs(Math.round(minutes));
								totals /= 60;
								e.minTotal = totals;
								this.alltotalOT += totals;
								this.overtimeIDs.push(e.id);
							}
						});

						if (!PastOT && this.alltotalOT) {
							this.sgs
								.Modal(
									{
										header: `Found Approved OT for this Cut off`,
										content: `Add the ${this.alltotalOT}/hrs OT to the Payslip?`,
										type: `confirmation`,
									},
									{ size: 'sm' }
								)
								.confirm.subscribe((response) => {
									if (response) {
										//AGREE TO ADD TO THE CURRENT PAYSLIP
										this.alltotalOT = this.alltotalOT;
									} else {
										//DISAGREE TO ADD TO THE CURRENT PAYSLIP
										this.alltotalOT = 0;
										this.overtimeIDs = [];
									}
									sendData();
								});
						} else if (PastOT && !this.alltotalOT) {
							this.sgs
								.Modal(
									{
										header: `Found Other Approved OT for this Person`,
										content: `Add this Found ${PastOT}/hrs  Other OT to this Payslip?`,
										type: `confirmation`,
									},
									{ size: 'sm' }
								)
								.confirm.subscribe((response) => {
									if (response) {
										//AGREE TO ADD TO THE CURRENT PAYSLIP
										PastOT = PastOT;
									} else {
										//DISAGREE TO ADD TO THE CURRENT PAYSLIP
										PastOT = 0;
										this.PastovertimeIDs = [];
									}
									sendData();
								});
						} else if (PastOT && this.alltotalOT) {
							this.sgs
								.Modal(
									{
										header: `Found Other Approved OT for this Person`,
										content: `Add this Found ${PastOT}/hrs  Other OT to this Payslip?`,
										type: `confirmation`,
									},
									{ size: 'sm' }
								)
								.confirm.subscribe((response) => {
									if (response) {
										//AGREE TO ADD TO THE CURRENT PAYSLIP
										PastOT = PastOT;
									} else {
										//DISAGREE TO ADD TO THE CURRENT PAYSLIP
										PastOT = 0;
										this.PastovertimeIDs = [];
									}

									this.sgs
										.Modal(
											{
												header: `Found Approved OT for this Cut off`,
												content: `Add the ${this.alltotalOT}/hrs OT to the Payslip?`,
												type: `confirmation`,
											},
											{ size: 'sm' }
										)
										.confirm.subscribe((response) => {
											if (response) {
												//AGREE TO ADD TO THE CURRENT PAYSLIP
												this.alltotalOT = this.alltotalOT;
											} else {
												//DISAGREE TO ADD TO THE CURRENT PAYSLIP
												this.alltotalOT = 0;
												this.overtimeIDs = [];
											}
											sendData();
										});
								});
						} else if (!PastOT && !this.alltotalOT) {
							sendData();
						}

						//DID NOT FOUND A REQUEST FOR OT FOR THE EMPLOYEE, EMPLOYEE NEVER REQUEST EVER
					} else {
						console.log('response.data.length !== 0 ELSELSLSE');
						sendData();
					}

					////QUERY FAIL getAllOvertime WITH ID ONLY
				} else {
					//SEND A BASIC DATA
					sendData();
				}
			});

			//THERE IS ALREAD AT LEAST ONE OR MORE PAYSLIP THAT IS PRINTED OR GENERATED FOR THIS CUT OFF
		} else {
			console.log('else this.activePayroll.summary.length === 0');

			let check = [];
			let PastovertimeIDs = [];

			// GET ALL THE EMPLOYEE IDS FOR THIS PAYROLL
			this.activePayroll.summary.map((e) => check.push(e.eid));

			console.log(check);

			//CHECK IF THE EMPLOYEE IS INCLUDED FOR THIS PAYROLL IF INCLUDED NO MORE CHECKING FOR THE OVERTIME SINCE IT IS ALREADY ASKED PREVIOUSLY
			if (check.includes(id)) {
				console.log('check includes');
				const activeModal = this.ngbModal.open(PayslipComponent, {
					size: 'lg',
					container: 'nb-layout',
					windowClass: 'min_height',
					backdrop: 'static',
				});
				activeModal.componentInstance.eid = id;
				activeModal.componentInstance.OTflag = false;
				// activeModal.componentInstance.overtimeIDs = overtimeIDs;
				// activeModal.componentInstance.approvedOT =  this.alltotalOT;
				activeModal.componentInstance.cutOffFrom = this.activePayroll.cutOffFrom;
				activeModal.componentInstance.cutOffTo = this.activePayroll.cutOffTo;
				activeModal.componentInstance.pid = this.activePayroll.id;
			}

			//IF THE EMPLOYEE IS NOT INCLUDED IN THE PAYROLL, IT MEANS THAT HE NEVER PRINTED A PAYSLIP, PROCEED THE PROCESS
			if (!check.includes(id)) {
				console.log('not not check includes');

				let OtherOT = [];
				let OTaddORnot: Boolean;
				let overtimeIDs = [];
				let PastovertimeIDs = [];

				//CHEK ALL APPROVED OVERTIME REQUEST FOR THIS EMPLOYEE
				this.sgs.request('get', 'overtime/getAllOvertime', { id: id }, async (response) => {
					console.log('Past or Future OT found');
					console.log(response.data);
					console.log(response.data.length);
					console.log(response.success);

					//QUERY SUCCESS getAllOvertime WITH ID ONLY
					if (response.success) {
						//FOUND A REQUEST FOR THE EMPLOYEE
						if (response.data.length !== 0) {
							console.log('FOUND A REQUEST FOR THE EMPLOYEE');
							console.log(response.data);
							console.log(response.data.length);

							//SEPARATE THIS CUT OFF AND OTHER CUT OFF FOUND FOR THIS EMPLOYEE
							await response.data.filter((e) => {
								//THIS IS FOR OTHER CUT OFF
								if (e.payroll_id !== this.activePayroll.id) {
									var start = moment(new Date(this.rd.transform(e.start)));
									var end = moment(new Date(this.rd.transform(e.end)));
									var duration = moment.duration(start.diff(end));
									var minutes = duration.asMinutes();
									var totals = Math.abs(Math.round(minutes));
									totals /= 60;
									e.minTotal = totals;
									PastOT += totals;
									PastovertimeIDs.push(e.id);
									OtherOT.push(e);
									//THIS IS FOR THE CURRENT CUT OFF
								} else {
									var start = moment(new Date(this.rd.transform(e.start)));
									var end = moment(new Date(this.rd.transform(e.end)));
									var duration = moment.duration(start.diff(end));
									var minutes = duration.asMinutes();
									var totals = Math.abs(Math.round(minutes));
									totals /= 60;
									e.minTotal = totals;
									this.alltotalOT += totals;
									overtimeIDs.push(e.id);
								}
							});

							if (!PastOT && this.alltotalOT) {
								this.sgs
									.Modal(
										{
											header: `Found Approved OT for this Cut off`,
											content: `Add the ${this.alltotalOT}/hrs OT to the Payslip?`,
											type: `confirmation`,
										},
										{ size: 'sm' }
									)
									.confirm.subscribe((response) => {
										if (response) {
											//AGREE TO ADD TO THE CURRENT PAYSLIP
											this.alltotalOT = this.alltotalOT;
										} else {
											//DISAGREE TO ADD TO THE CURRENT PAYSLIP
											this.alltotalOT = 0;
											overtimeIDs = [];
										}
										sendData();
									});
							} else if (PastOT && !this.alltotalOT) {
								this.sgs
									.Modal(
										{
											header: `Found Other Approved OT for this Person`,
											content: `Add this Found ${PastOT}/hrs  Other OT to this Payslip?`,
											type: `confirmation`,
										},
										{ size: 'sm' }
									)
									.confirm.subscribe((response) => {
										if (response) {
											//AGREE TO ADD TO THE CURRENT PAYSLIP
											PastOT = PastOT;
										} else {
											//DISAGREE TO ADD TO THE CURRENT PAYSLIP
											PastOT = 0;
											PastovertimeIDs = [];
										}
										sendData();
									});
							} else if (PastOT && this.alltotalOT) {
								this.sgs
									.Modal(
										{
											header: `Found Other Approved OT for this Person`,
											content: `Add this Found ${PastOT}/hrs  Other OT to this Payslip?`,
											type: `confirmation`,
										},
										{ size: 'sm' }
									)
									.confirm.subscribe((response) => {
										if (response) {
											//AGREE TO ADD TO THE CURRENT PAYSLIP
											PastOT = PastOT;
										} else {
											//DISAGREE TO ADD TO THE CURRENT PAYSLIP
											PastOT = 0;
											PastovertimeIDs = [];
										}

										this.sgs
											.Modal(
												{
													header: `Found Approved OT for this Cut off`,
													content: `Add the ${this.alltotalOT}/hrs OT to the Payslip?`,
													type: `confirmation`,
												},
												{ size: 'sm' }
											)
											.confirm.subscribe((response) => {
												if (response) {
													//AGREE TO ADD TO THE CURRENT PAYSLIP
													this.alltotalOT = this.alltotalOT;
												} else {
													//DISAGREE TO ADD TO THE CURRENT PAYSLIP
													this.alltotalOT = 0;
													overtimeIDs = [];
												}
												sendData();
											});
									});
							} else if (!PastOT && !this.alltotalOT) {
								sendData();
							}

							//DID NOT FOUND A REQUEST FOR OT FOR THE EMPLOYEE, EMPLOYEE NEVER REQUEST EVER
						} else {
							sendData();
						}
						////QUERY FAIL getAllOvertime WITH ID ONLY
					} else {
						//SEND A BASIC DATA
						sendData();
					}
				});
			}
		}
	}

	checkStatus() {
		this.sgs.Modal(
			{
				header: `System Messagge`,
				content: `
        You have successfully created a payroll for the selected employee.
      `,
				buttonName: 'close',
			},
			{ size: 'sm' }
		);
	}

	viewPayrollEntry() {
		console.log('test viewpayroll entry');
	}

	print(summary, from, to, dateAdded, id) {
		const activeModal = this.ngbModal.open(PrintPayslipComponent, {
			size: 'lg',
			container: 'nb-layout',
			windowClass: 'min_height',
			backdrop: 'static',
		});
		activeModal.componentInstance.summary = summary;
		activeModal.componentInstance.from = from;
		activeModal.componentInstance.to = to;
		activeModal.componentInstance.dateAdded = dateAdded;
		activeModal.componentInstance.payrollID = id;
	}

	editPayslip(id, data) {
		const activeModal = this.ngbModal.open(EditPayslipComponent, {
			size: 'lg',
			container: 'nb-layout',
			windowClass: 'min_height',
			backdrop: 'static',
		});
		activeModal.componentInstance.eid = id;
		activeModal.componentInstance.cutOffFrom = this.activePayroll.cutOffFrom;
		activeModal.componentInstance.cutOffTo = this.activePayroll.cutOffTo;
		activeModal.componentInstance.pid = this.activePayroll.id;
		activeModal.componentInstance.profile = data;
	}

	addAllowance(id) {
		const activeModal = this.ngbModal.open(AddAllowanceComponent, {
			size: 'sm',
			container: 'nb-layout',
			windowClass: 'min_height',
			backdrop: 'static',
		});
		activeModal.componentInstance.id = id;
		activeModal.componentInstance.pid = this.activePayroll.id;
	}

	totalSSS = 0;
	totalPagIbig = 0;
	totalPhilHealth = 0;
	totalWTax = 0;
	totalTakeHome = 0;
	totalAllowance = 0;
	debit = 0;
	credit = 0;

	savePayroll() {
		//compute
		this.activePayroll.summary.map((a) => {
			this.totalSSS += a.comp_sss + a.sss;
			this.totalPagIbig += a.comp_pagIbig;
			this.totalPhilHealth += a.comp_philHealth;
			this.totalWTax += a.wTax;
			this.totalTakeHome += a.takeHomePay;
			this.totalAllowance += a.allowance;

			this.debit = this.totalSSS + this.totalPagIbig + this.totalPhilHealth + this.totalWTax + this.totalTakeHome + this.totalAllowance;
			this.credit = this.totalSSS + this.totalPagIbig + this.totalPhilHealth + this.totalWTax + this.totalTakeHome + this.totalAllowance;
		});

		let tr = [];
		let th = [
			`
      <tr>
        <th>Account Code</th>
        <th>Account</th>
        <th>Debit</th>
        <th>Credit</th>
      </tr>
    `,
		];
		// Are you sure you want to save this payroll?
		this.sgs
			.Modal(
				{
					header: `System Messagge`,
					content: `
       <h5><center>Payroll Journal Summary</center></h5>
       <table class="wide">
        <thead>
          ${th}
        </thead>
        <tbody>
          <tr>
            <td>5-1-01-046</td>
            <td>Salaries expense - net basic pay</td>
            <td>${this.totalTakeHome.toFixed(2)}</td>
            <td></td>
          </tr>

          <tr>
            <td>5-1-01-045</td>
            <td>salaries expense - allowance</td>
            <td>${this.totalAllowance.toFixed(2)}</td>
            <td></td>
          </tr>
          <tr>
            <td>5-1-01-045</td>
            <td>SSS Contribution Expense</td>
            <td>${this.totalSSS.toFixed(2)}</td>
            <td></td>
          </tr>
          <tr>
            <td>5-1-01-045</td>
            <td>Phil-Health Contribution Expense</td>
            <td>${this.totalPhilHealth.toFixed(2)}</td>
            <td></td>
          </tr>
          <tr>
            <td>5-1-01-045</td>
            <td>Pag-ibig Contribution Expense</td>
            <td>${this.totalPagIbig.toFixed(2)}</td>
            <td></td>
          </tr>

          <tr>
            <td>5-1-01-046</td>
            <td>Salaries Payable - net basic pay</td>
            <td></td>
            <td>${this.totalTakeHome.toFixed(2)}</td>
          </tr>

          <tr>
            <td>5-1-01-045</td>
            <td>salaries Payable - allowance</td>
            <td></td>
            <td>${this.totalAllowance.toFixed(2)}</td>
          </tr>
          <tr>
            <td>5-1-01-045</td>
            <td>SSS Contribution Payable</td>
            <td></td>
            <td>${this.totalSSS.toFixed(2)}</td>
          </tr>
          <tr>
            <td>5-1-01-045</td>
            <td>Phil-Health Contribution Payable</td>
            <td></td>
            <td>${this.totalPhilHealth.toFixed(2)}</td>
          </tr>
          <tr>
            <td>5-1-01-045</td>
            <td>Pag-ibig Contribution Payable</td>
            <td></td>
            <td>${this.totalPagIbig.toFixed(2)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" class="acenter">TOTAL</td>
            <td>${this.debit}</td>
            <td>${this.credit}</td>
        </tfoot>
      </table>
      <p class="acenter error clear">Note: The data is irreversible once save, please review your data before saving.</p>
      `,
					type: 'confirmation',
					buttonName: 'close',
				},
				{ size: 'lg' }
			)
			.confirm.subscribe((response) => {
				if (response) {
					//payroll entries for journal
					let payroll = {
						paymentMethod: '',
						status: 1,
						referenceNo: this.activePayroll.id,
						transactionType: 'Payroll',
						memo: 'Payroll',
						total: this.debit,
						payeeType: 'Employee',
						journalTransactions: [
							{
								journalAccountID: 5101045,
								journalAccountName: 'Salaries expense - (net basic pay)',
								journalDescription: 'Salaries expense - (net basic pay)',
								entryType: 'Debit',
								amountCredit: 0,
								amountDebit: this.totalTakeHome,
							},
							{
								journalAccountID: 5101046,
								journalAccountName: 'Salaries expense - (allowance)',
								journalDescription: 'Salaries expense - (allowance)',
								entryType: 'Debit',
								amountCredit: 0,
								amountDebit: this.totalAllowance,
							},
							{
								journalAccountID: 5101041,
								journalAccountName: 'SSS contribution expense',
								journalDescription: 'SSS contribution expense',
								entryType: 'Debit',
								amountCredit: 0,
								amountDebit: this.totalSSS,
							},
							{
								journalAccountID: 5101043,
								journalAccountName: 'Phil-health contribution expense',
								journalDescription: 'Phil-health contribution expense',
								entryType: 'Debit',
								amountCredit: 0,
								amountDebit: this.totalPhilHealth,
							},
							{
								journalAccountID: 5101042,
								journalAccountName: 'Pag-ibig contribtution expense',
								journalDescription: 'Pag-ibig contribtution expense',
								entryType: 'Debit',
								amountCredit: 0,
								amountDebit: this.totalPhilHealth,
							},

							{
								journalAccountID: 2101011,
								journalAccountName: 'Salaries payable - (net basic pay)',
								journalDescription: 'Salaries payable - (net basic pay)',
								entryType: 'Debit',
								amountDebit: 0,
								amountCredit: this.totalTakeHome,
							},
							{
								journalAccountID: 2101012,
								journalAccountName: 'Salaries payable - (allowance)',
								journalDescription: 'Salaries payable - (allowance)',
								entryType: 'Debit',
								amountDebit: 0,
								amountCredit: this.totalAllowance,
							},
							{
								journalAccountID: 2101002,
								journalAccountName: 'SSS payable expense',
								journalDescription: 'SSS payable expense',
								entryType: 'Debit',
								amountDebit: 0,
								amountCredit: this.totalSSS,
							},
							{
								journalAccountID: 2101004,
								journalAccountName: 'Phil-health payable expense',
								journalDescription: 'Phil-health payable expense',
								entryType: 'Debit',
								amountDebit: 0,
								amountCredit: this.totalPhilHealth,
							},
							{
								journalAccountID: 2101010,
								journalAccountName: 'Pag-ibig payable expense',
								journalDescription: 'Pag-ibig payable expense',
								entryType: 'Debit',
								amountDebit: 0,
								amountCredit: this.totalPhilHealth,
							},
						],
					};

					// this.sgs.request('post', 'journalEntry/savePayroll', {payroll: payroll}, async (res) => {
					//   if(res.success){
					//     this.sgs.request('post', 'payroll/updateStatus', {pid: this.activePayroll.id, status: 5}, async (res) => {
					//       if(res.success){
					//         this.sgs.Toaster('succes', 'Success', "The Payroll has been successfully save.");
					//       }
					//     });
					//   }
					// })

					this.sgs.request('post', 'payroll/updateStatus', { pid: this.activePayroll.id, status: 5 }, async (res) => {
						if (res.success) {
							this.sgs.Toaster('succes', 'Success', 'The Payroll has been successfully save.');
						}
					});
				}
			});
	}
}