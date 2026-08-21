// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $GlobalHeadersTable extends GlobalHeaders
    with TableInfo<$GlobalHeadersTable, GlobalHeader> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $GlobalHeadersTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _noMeta = const VerificationMeta('no');
  @override
  late final GeneratedColumn<int> no = GeneratedColumn<int>(
      'no', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _kodeHeaderMeta =
      const VerificationMeta('kodeHeader');
  @override
  late final GeneratedColumn<String> kodeHeader = GeneratedColumn<String>(
      'kode_header', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _ulpMeta = const VerificationMeta('ulp');
  @override
  late final GeneratedColumn<String> ulp = GeneratedColumn<String>(
      'ulp', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _hariMeta = const VerificationMeta('hari');
  @override
  late final GeneratedColumn<String> hari = GeneratedColumn<String>(
      'hari', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _tanggalMeta =
      const VerificationMeta('tanggal');
  @override
  late final GeneratedColumn<String> tanggal = GeneratedColumn<String>(
      'tanggal', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _timMeta = const VerificationMeta('tim');
  @override
  late final GeneratedColumn<String> tim = GeneratedColumn<String>(
      'tim', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _subTimMeta = const VerificationMeta('subTim');
  @override
  late final GeneratedColumn<String> subTim = GeneratedColumn<String>(
      'sub_tim', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _koordinatAwalMeta =
      const VerificationMeta('koordinatAwal');
  @override
  late final GeneratedColumn<String> koordinatAwal = GeneratedColumn<String>(
      'koordinat_awal', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _koordinatAkhirMeta =
      const VerificationMeta('koordinatAkhir');
  @override
  late final GeneratedColumn<String> koordinatAkhir = GeneratedColumn<String>(
      'koordinat_akhir', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _kmAwalMeta = const VerificationMeta('kmAwal');
  @override
  late final GeneratedColumn<String> kmAwal = GeneratedColumn<String>(
      'km_awal', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _kmAkhirMeta =
      const VerificationMeta('kmAkhir');
  @override
  late final GeneratedColumn<String> kmAkhir = GeneratedColumn<String>(
      'km_akhir', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _kendalaMeta =
      const VerificationMeta('kendala');
  @override
  late final GeneratedColumn<String> kendala = GeneratedColumn<String>(
      'kendala', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _waTextMeta = const VerificationMeta('waText');
  @override
  late final GeneratedColumn<String> waText = GeneratedColumn<String>(
      'wa_text', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _timestampMeta =
      const VerificationMeta('timestamp');
  @override
  late final GeneratedColumn<String> timestamp = GeneratedColumn<String>(
      'timestamp', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _inputByMeta =
      const VerificationMeta('inputBy');
  @override
  late final GeneratedColumn<String> inputBy = GeneratedColumn<String>(
      'input_by', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _timestampUpdateMeta =
      const VerificationMeta('timestampUpdate');
  @override
  late final GeneratedColumn<String> timestampUpdate = GeneratedColumn<String>(
      'timestamp_update', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _statusTextWaMeta =
      const VerificationMeta('statusTextWa');
  @override
  late final GeneratedColumn<String> statusTextWa = GeneratedColumn<String>(
      'status_text_wa', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  @override
  List<GeneratedColumn> get $columns => [
        no,
        kodeHeader,
        ulp,
        hari,
        tanggal,
        tim,
        subTim,
        koordinatAwal,
        koordinatAkhir,
        kmAwal,
        kmAkhir,
        kendala,
        waText,
        timestamp,
        inputBy,
        timestampUpdate,
        statusTextWa
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'global_header';
  @override
  VerificationContext validateIntegrity(Insertable<GlobalHeader> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('no')) {
      context.handle(_noMeta, no.isAcceptableOrUnknown(data['no']!, _noMeta));
    }
    if (data.containsKey('kode_header')) {
      context.handle(
          _kodeHeaderMeta,
          kodeHeader.isAcceptableOrUnknown(
              data['kode_header']!, _kodeHeaderMeta));
    } else if (isInserting) {
      context.missing(_kodeHeaderMeta);
    }
    if (data.containsKey('ulp')) {
      context.handle(
          _ulpMeta, ulp.isAcceptableOrUnknown(data['ulp']!, _ulpMeta));
    }
    if (data.containsKey('hari')) {
      context.handle(
          _hariMeta, hari.isAcceptableOrUnknown(data['hari']!, _hariMeta));
    }
    if (data.containsKey('tanggal')) {
      context.handle(_tanggalMeta,
          tanggal.isAcceptableOrUnknown(data['tanggal']!, _tanggalMeta));
    }
    if (data.containsKey('tim')) {
      context.handle(
          _timMeta, tim.isAcceptableOrUnknown(data['tim']!, _timMeta));
    }
    if (data.containsKey('sub_tim')) {
      context.handle(_subTimMeta,
          subTim.isAcceptableOrUnknown(data['sub_tim']!, _subTimMeta));
    }
    if (data.containsKey('koordinat_awal')) {
      context.handle(
          _koordinatAwalMeta,
          koordinatAwal.isAcceptableOrUnknown(
              data['koordinat_awal']!, _koordinatAwalMeta));
    }
    if (data.containsKey('koordinat_akhir')) {
      context.handle(
          _koordinatAkhirMeta,
          koordinatAkhir.isAcceptableOrUnknown(
              data['koordinat_akhir']!, _koordinatAkhirMeta));
    }
    if (data.containsKey('km_awal')) {
      context.handle(_kmAwalMeta,
          kmAwal.isAcceptableOrUnknown(data['km_awal']!, _kmAwalMeta));
    }
    if (data.containsKey('km_akhir')) {
      context.handle(_kmAkhirMeta,
          kmAkhir.isAcceptableOrUnknown(data['km_akhir']!, _kmAkhirMeta));
    }
    if (data.containsKey('kendala')) {
      context.handle(_kendalaMeta,
          kendala.isAcceptableOrUnknown(data['kendala']!, _kendalaMeta));
    }
    if (data.containsKey('wa_text')) {
      context.handle(_waTextMeta,
          waText.isAcceptableOrUnknown(data['wa_text']!, _waTextMeta));
    }
    if (data.containsKey('timestamp')) {
      context.handle(_timestampMeta,
          timestamp.isAcceptableOrUnknown(data['timestamp']!, _timestampMeta));
    }
    if (data.containsKey('input_by')) {
      context.handle(_inputByMeta,
          inputBy.isAcceptableOrUnknown(data['input_by']!, _inputByMeta));
    }
    if (data.containsKey('timestamp_update')) {
      context.handle(
          _timestampUpdateMeta,
          timestampUpdate.isAcceptableOrUnknown(
              data['timestamp_update']!, _timestampUpdateMeta));
    }
    if (data.containsKey('status_text_wa')) {
      context.handle(
          _statusTextWaMeta,
          statusTextWa.isAcceptableOrUnknown(
              data['status_text_wa']!, _statusTextWaMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {kodeHeader};
  @override
  GlobalHeader map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return GlobalHeader(
      no: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}no']),
      kodeHeader: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kode_header'])!,
      ulp: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}ulp'])!,
      hari: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}hari'])!,
      tanggal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tanggal'])!,
      tim: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tim'])!,
      subTim: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sub_tim'])!,
      koordinatAwal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}koordinat_awal'])!,
      koordinatAkhir: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}koordinat_akhir'])!,
      kmAwal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}km_awal'])!,
      kmAkhir: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}km_akhir'])!,
      kendala: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kendala'])!,
      waText: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wa_text'])!,
      timestamp: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}timestamp'])!,
      inputBy: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}input_by'])!,
      timestampUpdate: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}timestamp_update'])!,
      statusTextWa: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status_text_wa'])!,
    );
  }

  @override
  $GlobalHeadersTable createAlias(String alias) {
    return $GlobalHeadersTable(attachedDatabase, alias);
  }
}

class GlobalHeader extends DataClass implements Insertable<GlobalHeader> {
  /// A — No: nomor urut di sheet (bukan kunci; bisa bergeser)
  final int? no;

  /// B — Kode Header: kunci utama & kunci relasi (FK) ke tabel anak
  final String kodeHeader;

  /// C — ULP
  final String ulp;

  /// D — Hari (Senin..Minggu)
  final String hari;

  /// E — Tanggal, TEXT format ISO "yyyy-MM-dd"
  final String tanggal;

  /// F — Tim (ROW / Hartek / Inspeksi Jaringan / ...)
  final String tim;

  /// G — Sub-Tim (dipakai filter di mobile)
  final String subTim;

  /// H — Koordinat Awal
  final String koordinatAwal;

  /// I — Koordinat Akhir
  final String koordinatAkhir;

  /// J — Km Awal (teks; bisa berisi "4,1")
  final String kmAwal;

  /// K — Km Akhir (teks)
  final String kmAkhir;

  /// L — Kendala
  final String kendala;

  /// M — WA Text (laporan hasil generate; teks panjang)
  final String waText;

  /// N — Timestamp input (string ISO)
  final String timestamp;

  /// O — Input By (username penginput)
  final String inputBy;

  /// P — Timestamp Update terakhir (di-stempel WA engine)
  final String timestampUpdate;

  /// Q — Status TextWA (mis. "Update")
  final String statusTextWa;
  const GlobalHeader(
      {this.no,
      required this.kodeHeader,
      required this.ulp,
      required this.hari,
      required this.tanggal,
      required this.tim,
      required this.subTim,
      required this.koordinatAwal,
      required this.koordinatAkhir,
      required this.kmAwal,
      required this.kmAkhir,
      required this.kendala,
      required this.waText,
      required this.timestamp,
      required this.inputBy,
      required this.timestampUpdate,
      required this.statusTextWa});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (!nullToAbsent || no != null) {
      map['no'] = Variable<int>(no);
    }
    map['kode_header'] = Variable<String>(kodeHeader);
    map['ulp'] = Variable<String>(ulp);
    map['hari'] = Variable<String>(hari);
    map['tanggal'] = Variable<String>(tanggal);
    map['tim'] = Variable<String>(tim);
    map['sub_tim'] = Variable<String>(subTim);
    map['koordinat_awal'] = Variable<String>(koordinatAwal);
    map['koordinat_akhir'] = Variable<String>(koordinatAkhir);
    map['km_awal'] = Variable<String>(kmAwal);
    map['km_akhir'] = Variable<String>(kmAkhir);
    map['kendala'] = Variable<String>(kendala);
    map['wa_text'] = Variable<String>(waText);
    map['timestamp'] = Variable<String>(timestamp);
    map['input_by'] = Variable<String>(inputBy);
    map['timestamp_update'] = Variable<String>(timestampUpdate);
    map['status_text_wa'] = Variable<String>(statusTextWa);
    return map;
  }

  GlobalHeadersCompanion toCompanion(bool nullToAbsent) {
    return GlobalHeadersCompanion(
      no: no == null && nullToAbsent ? const Value.absent() : Value(no),
      kodeHeader: Value(kodeHeader),
      ulp: Value(ulp),
      hari: Value(hari),
      tanggal: Value(tanggal),
      tim: Value(tim),
      subTim: Value(subTim),
      koordinatAwal: Value(koordinatAwal),
      koordinatAkhir: Value(koordinatAkhir),
      kmAwal: Value(kmAwal),
      kmAkhir: Value(kmAkhir),
      kendala: Value(kendala),
      waText: Value(waText),
      timestamp: Value(timestamp),
      inputBy: Value(inputBy),
      timestampUpdate: Value(timestampUpdate),
      statusTextWa: Value(statusTextWa),
    );
  }

  factory GlobalHeader.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return GlobalHeader(
      no: serializer.fromJson<int?>(json['no']),
      kodeHeader: serializer.fromJson<String>(json['kodeHeader']),
      ulp: serializer.fromJson<String>(json['ulp']),
      hari: serializer.fromJson<String>(json['hari']),
      tanggal: serializer.fromJson<String>(json['tanggal']),
      tim: serializer.fromJson<String>(json['tim']),
      subTim: serializer.fromJson<String>(json['subTim']),
      koordinatAwal: serializer.fromJson<String>(json['koordinatAwal']),
      koordinatAkhir: serializer.fromJson<String>(json['koordinatAkhir']),
      kmAwal: serializer.fromJson<String>(json['kmAwal']),
      kmAkhir: serializer.fromJson<String>(json['kmAkhir']),
      kendala: serializer.fromJson<String>(json['kendala']),
      waText: serializer.fromJson<String>(json['waText']),
      timestamp: serializer.fromJson<String>(json['timestamp']),
      inputBy: serializer.fromJson<String>(json['inputBy']),
      timestampUpdate: serializer.fromJson<String>(json['timestampUpdate']),
      statusTextWa: serializer.fromJson<String>(json['statusTextWa']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'no': serializer.toJson<int?>(no),
      'kodeHeader': serializer.toJson<String>(kodeHeader),
      'ulp': serializer.toJson<String>(ulp),
      'hari': serializer.toJson<String>(hari),
      'tanggal': serializer.toJson<String>(tanggal),
      'tim': serializer.toJson<String>(tim),
      'subTim': serializer.toJson<String>(subTim),
      'koordinatAwal': serializer.toJson<String>(koordinatAwal),
      'koordinatAkhir': serializer.toJson<String>(koordinatAkhir),
      'kmAwal': serializer.toJson<String>(kmAwal),
      'kmAkhir': serializer.toJson<String>(kmAkhir),
      'kendala': serializer.toJson<String>(kendala),
      'waText': serializer.toJson<String>(waText),
      'timestamp': serializer.toJson<String>(timestamp),
      'inputBy': serializer.toJson<String>(inputBy),
      'timestampUpdate': serializer.toJson<String>(timestampUpdate),
      'statusTextWa': serializer.toJson<String>(statusTextWa),
    };
  }

  GlobalHeader copyWith(
          {Value<int?> no = const Value.absent(),
          String? kodeHeader,
          String? ulp,
          String? hari,
          String? tanggal,
          String? tim,
          String? subTim,
          String? koordinatAwal,
          String? koordinatAkhir,
          String? kmAwal,
          String? kmAkhir,
          String? kendala,
          String? waText,
          String? timestamp,
          String? inputBy,
          String? timestampUpdate,
          String? statusTextWa}) =>
      GlobalHeader(
        no: no.present ? no.value : this.no,
        kodeHeader: kodeHeader ?? this.kodeHeader,
        ulp: ulp ?? this.ulp,
        hari: hari ?? this.hari,
        tanggal: tanggal ?? this.tanggal,
        tim: tim ?? this.tim,
        subTim: subTim ?? this.subTim,
        koordinatAwal: koordinatAwal ?? this.koordinatAwal,
        koordinatAkhir: koordinatAkhir ?? this.koordinatAkhir,
        kmAwal: kmAwal ?? this.kmAwal,
        kmAkhir: kmAkhir ?? this.kmAkhir,
        kendala: kendala ?? this.kendala,
        waText: waText ?? this.waText,
        timestamp: timestamp ?? this.timestamp,
        inputBy: inputBy ?? this.inputBy,
        timestampUpdate: timestampUpdate ?? this.timestampUpdate,
        statusTextWa: statusTextWa ?? this.statusTextWa,
      );
  GlobalHeader copyWithCompanion(GlobalHeadersCompanion data) {
    return GlobalHeader(
      no: data.no.present ? data.no.value : this.no,
      kodeHeader:
          data.kodeHeader.present ? data.kodeHeader.value : this.kodeHeader,
      ulp: data.ulp.present ? data.ulp.value : this.ulp,
      hari: data.hari.present ? data.hari.value : this.hari,
      tanggal: data.tanggal.present ? data.tanggal.value : this.tanggal,
      tim: data.tim.present ? data.tim.value : this.tim,
      subTim: data.subTim.present ? data.subTim.value : this.subTim,
      koordinatAwal: data.koordinatAwal.present
          ? data.koordinatAwal.value
          : this.koordinatAwal,
      koordinatAkhir: data.koordinatAkhir.present
          ? data.koordinatAkhir.value
          : this.koordinatAkhir,
      kmAwal: data.kmAwal.present ? data.kmAwal.value : this.kmAwal,
      kmAkhir: data.kmAkhir.present ? data.kmAkhir.value : this.kmAkhir,
      kendala: data.kendala.present ? data.kendala.value : this.kendala,
      waText: data.waText.present ? data.waText.value : this.waText,
      timestamp: data.timestamp.present ? data.timestamp.value : this.timestamp,
      inputBy: data.inputBy.present ? data.inputBy.value : this.inputBy,
      timestampUpdate: data.timestampUpdate.present
          ? data.timestampUpdate.value
          : this.timestampUpdate,
      statusTextWa: data.statusTextWa.present
          ? data.statusTextWa.value
          : this.statusTextWa,
    );
  }

  @override
  String toString() {
    return (StringBuffer('GlobalHeader(')
          ..write('no: $no, ')
          ..write('kodeHeader: $kodeHeader, ')
          ..write('ulp: $ulp, ')
          ..write('hari: $hari, ')
          ..write('tanggal: $tanggal, ')
          ..write('tim: $tim, ')
          ..write('subTim: $subTim, ')
          ..write('koordinatAwal: $koordinatAwal, ')
          ..write('koordinatAkhir: $koordinatAkhir, ')
          ..write('kmAwal: $kmAwal, ')
          ..write('kmAkhir: $kmAkhir, ')
          ..write('kendala: $kendala, ')
          ..write('waText: $waText, ')
          ..write('timestamp: $timestamp, ')
          ..write('inputBy: $inputBy, ')
          ..write('timestampUpdate: $timestampUpdate, ')
          ..write('statusTextWa: $statusTextWa')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      no,
      kodeHeader,
      ulp,
      hari,
      tanggal,
      tim,
      subTim,
      koordinatAwal,
      koordinatAkhir,
      kmAwal,
      kmAkhir,
      kendala,
      waText,
      timestamp,
      inputBy,
      timestampUpdate,
      statusTextWa);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GlobalHeader &&
          other.no == this.no &&
          other.kodeHeader == this.kodeHeader &&
          other.ulp == this.ulp &&
          other.hari == this.hari &&
          other.tanggal == this.tanggal &&
          other.tim == this.tim &&
          other.subTim == this.subTim &&
          other.koordinatAwal == this.koordinatAwal &&
          other.koordinatAkhir == this.koordinatAkhir &&
          other.kmAwal == this.kmAwal &&
          other.kmAkhir == this.kmAkhir &&
          other.kendala == this.kendala &&
          other.waText == this.waText &&
          other.timestamp == this.timestamp &&
          other.inputBy == this.inputBy &&
          other.timestampUpdate == this.timestampUpdate &&
          other.statusTextWa == this.statusTextWa);
}

class GlobalHeadersCompanion extends UpdateCompanion<GlobalHeader> {
  final Value<int?> no;
  final Value<String> kodeHeader;
  final Value<String> ulp;
  final Value<String> hari;
  final Value<String> tanggal;
  final Value<String> tim;
  final Value<String> subTim;
  final Value<String> koordinatAwal;
  final Value<String> koordinatAkhir;
  final Value<String> kmAwal;
  final Value<String> kmAkhir;
  final Value<String> kendala;
  final Value<String> waText;
  final Value<String> timestamp;
  final Value<String> inputBy;
  final Value<String> timestampUpdate;
  final Value<String> statusTextWa;
  final Value<int> rowid;
  const GlobalHeadersCompanion({
    this.no = const Value.absent(),
    this.kodeHeader = const Value.absent(),
    this.ulp = const Value.absent(),
    this.hari = const Value.absent(),
    this.tanggal = const Value.absent(),
    this.tim = const Value.absent(),
    this.subTim = const Value.absent(),
    this.koordinatAwal = const Value.absent(),
    this.koordinatAkhir = const Value.absent(),
    this.kmAwal = const Value.absent(),
    this.kmAkhir = const Value.absent(),
    this.kendala = const Value.absent(),
    this.waText = const Value.absent(),
    this.timestamp = const Value.absent(),
    this.inputBy = const Value.absent(),
    this.timestampUpdate = const Value.absent(),
    this.statusTextWa = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  GlobalHeadersCompanion.insert({
    this.no = const Value.absent(),
    required String kodeHeader,
    this.ulp = const Value.absent(),
    this.hari = const Value.absent(),
    this.tanggal = const Value.absent(),
    this.tim = const Value.absent(),
    this.subTim = const Value.absent(),
    this.koordinatAwal = const Value.absent(),
    this.koordinatAkhir = const Value.absent(),
    this.kmAwal = const Value.absent(),
    this.kmAkhir = const Value.absent(),
    this.kendala = const Value.absent(),
    this.waText = const Value.absent(),
    this.timestamp = const Value.absent(),
    this.inputBy = const Value.absent(),
    this.timestampUpdate = const Value.absent(),
    this.statusTextWa = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : kodeHeader = Value(kodeHeader);
  static Insertable<GlobalHeader> custom({
    Expression<int>? no,
    Expression<String>? kodeHeader,
    Expression<String>? ulp,
    Expression<String>? hari,
    Expression<String>? tanggal,
    Expression<String>? tim,
    Expression<String>? subTim,
    Expression<String>? koordinatAwal,
    Expression<String>? koordinatAkhir,
    Expression<String>? kmAwal,
    Expression<String>? kmAkhir,
    Expression<String>? kendala,
    Expression<String>? waText,
    Expression<String>? timestamp,
    Expression<String>? inputBy,
    Expression<String>? timestampUpdate,
    Expression<String>? statusTextWa,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (no != null) 'no': no,
      if (kodeHeader != null) 'kode_header': kodeHeader,
      if (ulp != null) 'ulp': ulp,
      if (hari != null) 'hari': hari,
      if (tanggal != null) 'tanggal': tanggal,
      if (tim != null) 'tim': tim,
      if (subTim != null) 'sub_tim': subTim,
      if (koordinatAwal != null) 'koordinat_awal': koordinatAwal,
      if (koordinatAkhir != null) 'koordinat_akhir': koordinatAkhir,
      if (kmAwal != null) 'km_awal': kmAwal,
      if (kmAkhir != null) 'km_akhir': kmAkhir,
      if (kendala != null) 'kendala': kendala,
      if (waText != null) 'wa_text': waText,
      if (timestamp != null) 'timestamp': timestamp,
      if (inputBy != null) 'input_by': inputBy,
      if (timestampUpdate != null) 'timestamp_update': timestampUpdate,
      if (statusTextWa != null) 'status_text_wa': statusTextWa,
      if (rowid != null) 'rowid': rowid,
    });
  }

  GlobalHeadersCompanion copyWith(
      {Value<int?>? no,
      Value<String>? kodeHeader,
      Value<String>? ulp,
      Value<String>? hari,
      Value<String>? tanggal,
      Value<String>? tim,
      Value<String>? subTim,
      Value<String>? koordinatAwal,
      Value<String>? koordinatAkhir,
      Value<String>? kmAwal,
      Value<String>? kmAkhir,
      Value<String>? kendala,
      Value<String>? waText,
      Value<String>? timestamp,
      Value<String>? inputBy,
      Value<String>? timestampUpdate,
      Value<String>? statusTextWa,
      Value<int>? rowid}) {
    return GlobalHeadersCompanion(
      no: no ?? this.no,
      kodeHeader: kodeHeader ?? this.kodeHeader,
      ulp: ulp ?? this.ulp,
      hari: hari ?? this.hari,
      tanggal: tanggal ?? this.tanggal,
      tim: tim ?? this.tim,
      subTim: subTim ?? this.subTim,
      koordinatAwal: koordinatAwal ?? this.koordinatAwal,
      koordinatAkhir: koordinatAkhir ?? this.koordinatAkhir,
      kmAwal: kmAwal ?? this.kmAwal,
      kmAkhir: kmAkhir ?? this.kmAkhir,
      kendala: kendala ?? this.kendala,
      waText: waText ?? this.waText,
      timestamp: timestamp ?? this.timestamp,
      inputBy: inputBy ?? this.inputBy,
      timestampUpdate: timestampUpdate ?? this.timestampUpdate,
      statusTextWa: statusTextWa ?? this.statusTextWa,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (no.present) {
      map['no'] = Variable<int>(no.value);
    }
    if (kodeHeader.present) {
      map['kode_header'] = Variable<String>(kodeHeader.value);
    }
    if (ulp.present) {
      map['ulp'] = Variable<String>(ulp.value);
    }
    if (hari.present) {
      map['hari'] = Variable<String>(hari.value);
    }
    if (tanggal.present) {
      map['tanggal'] = Variable<String>(tanggal.value);
    }
    if (tim.present) {
      map['tim'] = Variable<String>(tim.value);
    }
    if (subTim.present) {
      map['sub_tim'] = Variable<String>(subTim.value);
    }
    if (koordinatAwal.present) {
      map['koordinat_awal'] = Variable<String>(koordinatAwal.value);
    }
    if (koordinatAkhir.present) {
      map['koordinat_akhir'] = Variable<String>(koordinatAkhir.value);
    }
    if (kmAwal.present) {
      map['km_awal'] = Variable<String>(kmAwal.value);
    }
    if (kmAkhir.present) {
      map['km_akhir'] = Variable<String>(kmAkhir.value);
    }
    if (kendala.present) {
      map['kendala'] = Variable<String>(kendala.value);
    }
    if (waText.present) {
      map['wa_text'] = Variable<String>(waText.value);
    }
    if (timestamp.present) {
      map['timestamp'] = Variable<String>(timestamp.value);
    }
    if (inputBy.present) {
      map['input_by'] = Variable<String>(inputBy.value);
    }
    if (timestampUpdate.present) {
      map['timestamp_update'] = Variable<String>(timestampUpdate.value);
    }
    if (statusTextWa.present) {
      map['status_text_wa'] = Variable<String>(statusTextWa.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('GlobalHeadersCompanion(')
          ..write('no: $no, ')
          ..write('kodeHeader: $kodeHeader, ')
          ..write('ulp: $ulp, ')
          ..write('hari: $hari, ')
          ..write('tanggal: $tanggal, ')
          ..write('tim: $tim, ')
          ..write('subTim: $subTim, ')
          ..write('koordinatAwal: $koordinatAwal, ')
          ..write('koordinatAkhir: $koordinatAkhir, ')
          ..write('kmAwal: $kmAwal, ')
          ..write('kmAkhir: $kmAkhir, ')
          ..write('kendala: $kendala, ')
          ..write('waText: $waText, ')
          ..write('timestamp: $timestamp, ')
          ..write('inputBy: $inputBy, ')
          ..write('timestampUpdate: $timestampUpdate, ')
          ..write('statusTextWa: $statusTextWa, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $MasterPenyulangsTable extends MasterPenyulangs
    with TableInfo<$MasterPenyulangsTable, MasterPenyulang> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $MasterPenyulangsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _noMeta = const VerificationMeta('no');
  @override
  late final GeneratedColumn<int> no = GeneratedColumn<int>(
      'no', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _ulpMeta = const VerificationMeta('ulp');
  @override
  late final GeneratedColumn<String> ulp = GeneratedColumn<String>(
      'ulp', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _namaPenyulangMeta =
      const VerificationMeta('namaPenyulang');
  @override
  late final GeneratedColumn<String> namaPenyulang = GeneratedColumn<String>(
      'nama_penyulang', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _namaSwitchingMeta =
      const VerificationMeta('namaSwitching');
  @override
  late final GeneratedColumn<String> namaSwitching = GeneratedColumn<String>(
      'nama_switching', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _sectionMeta =
      const VerificationMeta('section');
  @override
  late final GeneratedColumn<String> section = GeneratedColumn<String>(
      'section', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  @override
  List<GeneratedColumn> get $columns =>
      [id, no, ulp, namaPenyulang, namaSwitching, section];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'master_penyulang';
  @override
  VerificationContext validateIntegrity(Insertable<MasterPenyulang> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('no')) {
      context.handle(_noMeta, no.isAcceptableOrUnknown(data['no']!, _noMeta));
    }
    if (data.containsKey('ulp')) {
      context.handle(
          _ulpMeta, ulp.isAcceptableOrUnknown(data['ulp']!, _ulpMeta));
    }
    if (data.containsKey('nama_penyulang')) {
      context.handle(
          _namaPenyulangMeta,
          namaPenyulang.isAcceptableOrUnknown(
              data['nama_penyulang']!, _namaPenyulangMeta));
    }
    if (data.containsKey('nama_switching')) {
      context.handle(
          _namaSwitchingMeta,
          namaSwitching.isAcceptableOrUnknown(
              data['nama_switching']!, _namaSwitchingMeta));
    }
    if (data.containsKey('section')) {
      context.handle(_sectionMeta,
          section.isAcceptableOrUnknown(data['section']!, _sectionMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  MasterPenyulang map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return MasterPenyulang(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      no: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}no']),
      ulp: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}ulp'])!,
      namaPenyulang: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}nama_penyulang'])!,
      namaSwitching: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}nama_switching'])!,
      section: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}section'])!,
    );
  }

  @override
  $MasterPenyulangsTable createAlias(String alias) {
    return $MasterPenyulangsTable(attachedDatabase, alias);
  }
}

class MasterPenyulang extends DataClass implements Insertable<MasterPenyulang> {
  /// id lokal (auto-increment; sheet tidak punya kunci unik)
  final int id;

  /// A — No: nomor urut di sheet (bukan kunci)
  final int? no;

  /// B — ULP
  final String ulp;

  /// C — Nama Penyulang (bisa muncul berulang: 1 baris per section)
  final String namaPenyulang;

  /// D — Nama Switching
  final String namaSwitching;

  /// E — Section (label "Induk - Anak" untuk topologi)
  final String section;
  const MasterPenyulang(
      {required this.id,
      this.no,
      required this.ulp,
      required this.namaPenyulang,
      required this.namaSwitching,
      required this.section});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    if (!nullToAbsent || no != null) {
      map['no'] = Variable<int>(no);
    }
    map['ulp'] = Variable<String>(ulp);
    map['nama_penyulang'] = Variable<String>(namaPenyulang);
    map['nama_switching'] = Variable<String>(namaSwitching);
    map['section'] = Variable<String>(section);
    return map;
  }

  MasterPenyulangsCompanion toCompanion(bool nullToAbsent) {
    return MasterPenyulangsCompanion(
      id: Value(id),
      no: no == null && nullToAbsent ? const Value.absent() : Value(no),
      ulp: Value(ulp),
      namaPenyulang: Value(namaPenyulang),
      namaSwitching: Value(namaSwitching),
      section: Value(section),
    );
  }

  factory MasterPenyulang.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return MasterPenyulang(
      id: serializer.fromJson<int>(json['id']),
      no: serializer.fromJson<int?>(json['no']),
      ulp: serializer.fromJson<String>(json['ulp']),
      namaPenyulang: serializer.fromJson<String>(json['namaPenyulang']),
      namaSwitching: serializer.fromJson<String>(json['namaSwitching']),
      section: serializer.fromJson<String>(json['section']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'no': serializer.toJson<int?>(no),
      'ulp': serializer.toJson<String>(ulp),
      'namaPenyulang': serializer.toJson<String>(namaPenyulang),
      'namaSwitching': serializer.toJson<String>(namaSwitching),
      'section': serializer.toJson<String>(section),
    };
  }

  MasterPenyulang copyWith(
          {int? id,
          Value<int?> no = const Value.absent(),
          String? ulp,
          String? namaPenyulang,
          String? namaSwitching,
          String? section}) =>
      MasterPenyulang(
        id: id ?? this.id,
        no: no.present ? no.value : this.no,
        ulp: ulp ?? this.ulp,
        namaPenyulang: namaPenyulang ?? this.namaPenyulang,
        namaSwitching: namaSwitching ?? this.namaSwitching,
        section: section ?? this.section,
      );
  MasterPenyulang copyWithCompanion(MasterPenyulangsCompanion data) {
    return MasterPenyulang(
      id: data.id.present ? data.id.value : this.id,
      no: data.no.present ? data.no.value : this.no,
      ulp: data.ulp.present ? data.ulp.value : this.ulp,
      namaPenyulang: data.namaPenyulang.present
          ? data.namaPenyulang.value
          : this.namaPenyulang,
      namaSwitching: data.namaSwitching.present
          ? data.namaSwitching.value
          : this.namaSwitching,
      section: data.section.present ? data.section.value : this.section,
    );
  }

  @override
  String toString() {
    return (StringBuffer('MasterPenyulang(')
          ..write('id: $id, ')
          ..write('no: $no, ')
          ..write('ulp: $ulp, ')
          ..write('namaPenyulang: $namaPenyulang, ')
          ..write('namaSwitching: $namaSwitching, ')
          ..write('section: $section')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, no, ulp, namaPenyulang, namaSwitching, section);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MasterPenyulang &&
          other.id == this.id &&
          other.no == this.no &&
          other.ulp == this.ulp &&
          other.namaPenyulang == this.namaPenyulang &&
          other.namaSwitching == this.namaSwitching &&
          other.section == this.section);
}

class MasterPenyulangsCompanion extends UpdateCompanion<MasterPenyulang> {
  final Value<int> id;
  final Value<int?> no;
  final Value<String> ulp;
  final Value<String> namaPenyulang;
  final Value<String> namaSwitching;
  final Value<String> section;
  const MasterPenyulangsCompanion({
    this.id = const Value.absent(),
    this.no = const Value.absent(),
    this.ulp = const Value.absent(),
    this.namaPenyulang = const Value.absent(),
    this.namaSwitching = const Value.absent(),
    this.section = const Value.absent(),
  });
  MasterPenyulangsCompanion.insert({
    this.id = const Value.absent(),
    this.no = const Value.absent(),
    this.ulp = const Value.absent(),
    this.namaPenyulang = const Value.absent(),
    this.namaSwitching = const Value.absent(),
    this.section = const Value.absent(),
  });
  static Insertable<MasterPenyulang> custom({
    Expression<int>? id,
    Expression<int>? no,
    Expression<String>? ulp,
    Expression<String>? namaPenyulang,
    Expression<String>? namaSwitching,
    Expression<String>? section,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (no != null) 'no': no,
      if (ulp != null) 'ulp': ulp,
      if (namaPenyulang != null) 'nama_penyulang': namaPenyulang,
      if (namaSwitching != null) 'nama_switching': namaSwitching,
      if (section != null) 'section': section,
    });
  }

  MasterPenyulangsCompanion copyWith(
      {Value<int>? id,
      Value<int?>? no,
      Value<String>? ulp,
      Value<String>? namaPenyulang,
      Value<String>? namaSwitching,
      Value<String>? section}) {
    return MasterPenyulangsCompanion(
      id: id ?? this.id,
      no: no ?? this.no,
      ulp: ulp ?? this.ulp,
      namaPenyulang: namaPenyulang ?? this.namaPenyulang,
      namaSwitching: namaSwitching ?? this.namaSwitching,
      section: section ?? this.section,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (no.present) {
      map['no'] = Variable<int>(no.value);
    }
    if (ulp.present) {
      map['ulp'] = Variable<String>(ulp.value);
    }
    if (namaPenyulang.present) {
      map['nama_penyulang'] = Variable<String>(namaPenyulang.value);
    }
    if (namaSwitching.present) {
      map['nama_switching'] = Variable<String>(namaSwitching.value);
    }
    if (section.present) {
      map['section'] = Variable<String>(section.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('MasterPenyulangsCompanion(')
          ..write('id: $id, ')
          ..write('no: $no, ')
          ..write('ulp: $ulp, ')
          ..write('namaPenyulang: $namaPenyulang, ')
          ..write('namaSwitching: $namaSwitching, ')
          ..write('section: $section')
          ..write(')'))
        .toString();
  }
}

class $LaporanHariansTable extends LaporanHarians
    with TableInfo<$LaporanHariansTable, LaporanHarian> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LaporanHariansTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _noMeta = const VerificationMeta('no');
  @override
  late final GeneratedColumn<int> no = GeneratedColumn<int>(
      'no', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _tanggalMeta =
      const VerificationMeta('tanggal');
  @override
  late final GeneratedColumn<String> tanggal = GeneratedColumn<String>(
      'tanggal', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _penyulangMeta =
      const VerificationMeta('penyulang');
  @override
  late final GeneratedColumn<String> penyulang = GeneratedColumn<String>(
      'penyulang', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _panjangKmsMeta =
      const VerificationMeta('panjangKms');
  @override
  late final GeneratedColumn<String> panjangKms = GeneratedColumn<String>(
      'panjang_kms', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _temuanMeta = const VerificationMeta('temuan');
  @override
  late final GeneratedColumn<String> temuan = GeneratedColumn<String>(
      'temuan', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _eksekusiMeta =
      const VerificationMeta('eksekusi');
  @override
  late final GeneratedColumn<String> eksekusi = GeneratedColumn<String>(
      'eksekusi', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _laporanUp3Meta =
      const VerificationMeta('laporanUp3');
  @override
  late final GeneratedColumn<String> laporanUp3 = GeneratedColumn<String>(
      'laporan_up3', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _laporanUiwMeta =
      const VerificationMeta('laporanUiw');
  @override
  late final GeneratedColumn<String> laporanUiw = GeneratedColumn<String>(
      'laporan_uiw', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  @override
  List<GeneratedColumn> get $columns => [
        no,
        tanggal,
        penyulang,
        panjangKms,
        temuan,
        eksekusi,
        laporanUp3,
        laporanUiw
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'laporan_harian';
  @override
  VerificationContext validateIntegrity(Insertable<LaporanHarian> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('no')) {
      context.handle(_noMeta, no.isAcceptableOrUnknown(data['no']!, _noMeta));
    }
    if (data.containsKey('tanggal')) {
      context.handle(_tanggalMeta,
          tanggal.isAcceptableOrUnknown(data['tanggal']!, _tanggalMeta));
    } else if (isInserting) {
      context.missing(_tanggalMeta);
    }
    if (data.containsKey('penyulang')) {
      context.handle(_penyulangMeta,
          penyulang.isAcceptableOrUnknown(data['penyulang']!, _penyulangMeta));
    }
    if (data.containsKey('panjang_kms')) {
      context.handle(
          _panjangKmsMeta,
          panjangKms.isAcceptableOrUnknown(
              data['panjang_kms']!, _panjangKmsMeta));
    }
    if (data.containsKey('temuan')) {
      context.handle(_temuanMeta,
          temuan.isAcceptableOrUnknown(data['temuan']!, _temuanMeta));
    }
    if (data.containsKey('eksekusi')) {
      context.handle(_eksekusiMeta,
          eksekusi.isAcceptableOrUnknown(data['eksekusi']!, _eksekusiMeta));
    }
    if (data.containsKey('laporan_up3')) {
      context.handle(
          _laporanUp3Meta,
          laporanUp3.isAcceptableOrUnknown(
              data['laporan_up3']!, _laporanUp3Meta));
    }
    if (data.containsKey('laporan_uiw')) {
      context.handle(
          _laporanUiwMeta,
          laporanUiw.isAcceptableOrUnknown(
              data['laporan_uiw']!, _laporanUiwMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {tanggal};
  @override
  LaporanHarian map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LaporanHarian(
      no: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}no']),
      tanggal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tanggal'])!,
      penyulang: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}penyulang'])!,
      panjangKms: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}panjang_kms'])!,
      temuan: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}temuan'])!,
      eksekusi: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}eksekusi'])!,
      laporanUp3: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}laporan_up3'])!,
      laporanUiw: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}laporan_uiw'])!,
    );
  }

  @override
  $LaporanHariansTable createAlias(String alias) {
    return $LaporanHariansTable(attachedDatabase, alias);
  }
}

class LaporanHarian extends DataClass implements Insertable<LaporanHarian> {
  /// A — No: nomor urut di sheet (bukan kunci)
  final int? no;

  /// B — Tanggal, TEXT ISO "yyyy-MM-dd" (kunci utama)
  final String tanggal;

  /// C — Penyulang (input manual C4A)
  final String penyulang;

  /// D — Panjang kmS Inspeksi (teks gaya Indonesia, mis. "4,1")
  final String panjangKms;

  /// E — Temuan (input manual C4A)
  final String temuan;

  /// F — Eksekusi (input manual C4A)
  final String eksekusi;

  /// G — Laporan UP3 (teks WA hasil generate server; panjang)
  final String laporanUp3;

  /// H — Laporan UIW (teks WA hasil generate server; panjang)
  final String laporanUiw;
  const LaporanHarian(
      {this.no,
      required this.tanggal,
      required this.penyulang,
      required this.panjangKms,
      required this.temuan,
      required this.eksekusi,
      required this.laporanUp3,
      required this.laporanUiw});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (!nullToAbsent || no != null) {
      map['no'] = Variable<int>(no);
    }
    map['tanggal'] = Variable<String>(tanggal);
    map['penyulang'] = Variable<String>(penyulang);
    map['panjang_kms'] = Variable<String>(panjangKms);
    map['temuan'] = Variable<String>(temuan);
    map['eksekusi'] = Variable<String>(eksekusi);
    map['laporan_up3'] = Variable<String>(laporanUp3);
    map['laporan_uiw'] = Variable<String>(laporanUiw);
    return map;
  }

  LaporanHariansCompanion toCompanion(bool nullToAbsent) {
    return LaporanHariansCompanion(
      no: no == null && nullToAbsent ? const Value.absent() : Value(no),
      tanggal: Value(tanggal),
      penyulang: Value(penyulang),
      panjangKms: Value(panjangKms),
      temuan: Value(temuan),
      eksekusi: Value(eksekusi),
      laporanUp3: Value(laporanUp3),
      laporanUiw: Value(laporanUiw),
    );
  }

  factory LaporanHarian.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LaporanHarian(
      no: serializer.fromJson<int?>(json['no']),
      tanggal: serializer.fromJson<String>(json['tanggal']),
      penyulang: serializer.fromJson<String>(json['penyulang']),
      panjangKms: serializer.fromJson<String>(json['panjangKms']),
      temuan: serializer.fromJson<String>(json['temuan']),
      eksekusi: serializer.fromJson<String>(json['eksekusi']),
      laporanUp3: serializer.fromJson<String>(json['laporanUp3']),
      laporanUiw: serializer.fromJson<String>(json['laporanUiw']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'no': serializer.toJson<int?>(no),
      'tanggal': serializer.toJson<String>(tanggal),
      'penyulang': serializer.toJson<String>(penyulang),
      'panjangKms': serializer.toJson<String>(panjangKms),
      'temuan': serializer.toJson<String>(temuan),
      'eksekusi': serializer.toJson<String>(eksekusi),
      'laporanUp3': serializer.toJson<String>(laporanUp3),
      'laporanUiw': serializer.toJson<String>(laporanUiw),
    };
  }

  LaporanHarian copyWith(
          {Value<int?> no = const Value.absent(),
          String? tanggal,
          String? penyulang,
          String? panjangKms,
          String? temuan,
          String? eksekusi,
          String? laporanUp3,
          String? laporanUiw}) =>
      LaporanHarian(
        no: no.present ? no.value : this.no,
        tanggal: tanggal ?? this.tanggal,
        penyulang: penyulang ?? this.penyulang,
        panjangKms: panjangKms ?? this.panjangKms,
        temuan: temuan ?? this.temuan,
        eksekusi: eksekusi ?? this.eksekusi,
        laporanUp3: laporanUp3 ?? this.laporanUp3,
        laporanUiw: laporanUiw ?? this.laporanUiw,
      );
  LaporanHarian copyWithCompanion(LaporanHariansCompanion data) {
    return LaporanHarian(
      no: data.no.present ? data.no.value : this.no,
      tanggal: data.tanggal.present ? data.tanggal.value : this.tanggal,
      penyulang: data.penyulang.present ? data.penyulang.value : this.penyulang,
      panjangKms:
          data.panjangKms.present ? data.panjangKms.value : this.panjangKms,
      temuan: data.temuan.present ? data.temuan.value : this.temuan,
      eksekusi: data.eksekusi.present ? data.eksekusi.value : this.eksekusi,
      laporanUp3:
          data.laporanUp3.present ? data.laporanUp3.value : this.laporanUp3,
      laporanUiw:
          data.laporanUiw.present ? data.laporanUiw.value : this.laporanUiw,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LaporanHarian(')
          ..write('no: $no, ')
          ..write('tanggal: $tanggal, ')
          ..write('penyulang: $penyulang, ')
          ..write('panjangKms: $panjangKms, ')
          ..write('temuan: $temuan, ')
          ..write('eksekusi: $eksekusi, ')
          ..write('laporanUp3: $laporanUp3, ')
          ..write('laporanUiw: $laporanUiw')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(no, tanggal, penyulang, panjangKms, temuan,
      eksekusi, laporanUp3, laporanUiw);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LaporanHarian &&
          other.no == this.no &&
          other.tanggal == this.tanggal &&
          other.penyulang == this.penyulang &&
          other.panjangKms == this.panjangKms &&
          other.temuan == this.temuan &&
          other.eksekusi == this.eksekusi &&
          other.laporanUp3 == this.laporanUp3 &&
          other.laporanUiw == this.laporanUiw);
}

class LaporanHariansCompanion extends UpdateCompanion<LaporanHarian> {
  final Value<int?> no;
  final Value<String> tanggal;
  final Value<String> penyulang;
  final Value<String> panjangKms;
  final Value<String> temuan;
  final Value<String> eksekusi;
  final Value<String> laporanUp3;
  final Value<String> laporanUiw;
  final Value<int> rowid;
  const LaporanHariansCompanion({
    this.no = const Value.absent(),
    this.tanggal = const Value.absent(),
    this.penyulang = const Value.absent(),
    this.panjangKms = const Value.absent(),
    this.temuan = const Value.absent(),
    this.eksekusi = const Value.absent(),
    this.laporanUp3 = const Value.absent(),
    this.laporanUiw = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LaporanHariansCompanion.insert({
    this.no = const Value.absent(),
    required String tanggal,
    this.penyulang = const Value.absent(),
    this.panjangKms = const Value.absent(),
    this.temuan = const Value.absent(),
    this.eksekusi = const Value.absent(),
    this.laporanUp3 = const Value.absent(),
    this.laporanUiw = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : tanggal = Value(tanggal);
  static Insertable<LaporanHarian> custom({
    Expression<int>? no,
    Expression<String>? tanggal,
    Expression<String>? penyulang,
    Expression<String>? panjangKms,
    Expression<String>? temuan,
    Expression<String>? eksekusi,
    Expression<String>? laporanUp3,
    Expression<String>? laporanUiw,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (no != null) 'no': no,
      if (tanggal != null) 'tanggal': tanggal,
      if (penyulang != null) 'penyulang': penyulang,
      if (panjangKms != null) 'panjang_kms': panjangKms,
      if (temuan != null) 'temuan': temuan,
      if (eksekusi != null) 'eksekusi': eksekusi,
      if (laporanUp3 != null) 'laporan_up3': laporanUp3,
      if (laporanUiw != null) 'laporan_uiw': laporanUiw,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LaporanHariansCompanion copyWith(
      {Value<int?>? no,
      Value<String>? tanggal,
      Value<String>? penyulang,
      Value<String>? panjangKms,
      Value<String>? temuan,
      Value<String>? eksekusi,
      Value<String>? laporanUp3,
      Value<String>? laporanUiw,
      Value<int>? rowid}) {
    return LaporanHariansCompanion(
      no: no ?? this.no,
      tanggal: tanggal ?? this.tanggal,
      penyulang: penyulang ?? this.penyulang,
      panjangKms: panjangKms ?? this.panjangKms,
      temuan: temuan ?? this.temuan,
      eksekusi: eksekusi ?? this.eksekusi,
      laporanUp3: laporanUp3 ?? this.laporanUp3,
      laporanUiw: laporanUiw ?? this.laporanUiw,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (no.present) {
      map['no'] = Variable<int>(no.value);
    }
    if (tanggal.present) {
      map['tanggal'] = Variable<String>(tanggal.value);
    }
    if (penyulang.present) {
      map['penyulang'] = Variable<String>(penyulang.value);
    }
    if (panjangKms.present) {
      map['panjang_kms'] = Variable<String>(panjangKms.value);
    }
    if (temuan.present) {
      map['temuan'] = Variable<String>(temuan.value);
    }
    if (eksekusi.present) {
      map['eksekusi'] = Variable<String>(eksekusi.value);
    }
    if (laporanUp3.present) {
      map['laporan_up3'] = Variable<String>(laporanUp3.value);
    }
    if (laporanUiw.present) {
      map['laporan_uiw'] = Variable<String>(laporanUiw.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LaporanHariansCompanion(')
          ..write('no: $no, ')
          ..write('tanggal: $tanggal, ')
          ..write('penyulang: $penyulang, ')
          ..write('panjangKms: $panjangKms, ')
          ..write('temuan: $temuan, ')
          ..write('eksekusi: $eksekusi, ')
          ..write('laporanUp3: $laporanUp3, ')
          ..write('laporanUiw: $laporanUiw, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SyncInfosTable extends SyncInfos
    with TableInfo<$SyncInfosTable, SyncInfo> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncInfosTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
      'key', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _lastSyncAtMeta =
      const VerificationMeta('lastSyncAt');
  @override
  late final GeneratedColumn<String> lastSyncAt = GeneratedColumn<String>(
      'last_sync_at', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _jumlahDataMeta =
      const VerificationMeta('jumlahData');
  @override
  late final GeneratedColumn<int> jumlahData = GeneratedColumn<int>(
      'jumlah_data', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _keteranganMeta =
      const VerificationMeta('keterangan');
  @override
  late final GeneratedColumn<String> keterangan = GeneratedColumn<String>(
      'keterangan', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  @override
  List<GeneratedColumn> get $columns =>
      [key, lastSyncAt, jumlahData, keterangan];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_info';
  @override
  VerificationContext validateIntegrity(Insertable<SyncInfo> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('key')) {
      context.handle(
          _keyMeta, key.isAcceptableOrUnknown(data['key']!, _keyMeta));
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('last_sync_at')) {
      context.handle(
          _lastSyncAtMeta,
          lastSyncAt.isAcceptableOrUnknown(
              data['last_sync_at']!, _lastSyncAtMeta));
    }
    if (data.containsKey('jumlah_data')) {
      context.handle(
          _jumlahDataMeta,
          jumlahData.isAcceptableOrUnknown(
              data['jumlah_data']!, _jumlahDataMeta));
    }
    if (data.containsKey('keterangan')) {
      context.handle(
          _keteranganMeta,
          keterangan.isAcceptableOrUnknown(
              data['keterangan']!, _keteranganMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {key};
  @override
  SyncInfo map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SyncInfo(
      key: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}key'])!,
      lastSyncAt: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}last_sync_at'])!,
      jumlahData: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}jumlah_data'])!,
      keterangan: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}keterangan'])!,
    );
  }

  @override
  $SyncInfosTable createAlias(String alias) {
    return $SyncInfosTable(attachedDatabase, alias);
  }
}

class SyncInfo extends DataClass implements Insertable<SyncInfo> {
  /// Nama modul/kunci: 'masterData', 'laporanTeknik', 'perangkatId', dst
  final String key;

  /// ISO datetime terakhir sinkron ('' = belum pernah)
  final String lastSyncAt;

  /// Jumlah data hasil sinkron terakhir
  final int jumlahData;

  /// Catatan/nilai bebas (mis. nilai perangkatId disimpan di kolom ini)
  final String keterangan;
  const SyncInfo(
      {required this.key,
      required this.lastSyncAt,
      required this.jumlahData,
      required this.keterangan});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['key'] = Variable<String>(key);
    map['last_sync_at'] = Variable<String>(lastSyncAt);
    map['jumlah_data'] = Variable<int>(jumlahData);
    map['keterangan'] = Variable<String>(keterangan);
    return map;
  }

  SyncInfosCompanion toCompanion(bool nullToAbsent) {
    return SyncInfosCompanion(
      key: Value(key),
      lastSyncAt: Value(lastSyncAt),
      jumlahData: Value(jumlahData),
      keterangan: Value(keterangan),
    );
  }

  factory SyncInfo.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SyncInfo(
      key: serializer.fromJson<String>(json['key']),
      lastSyncAt: serializer.fromJson<String>(json['lastSyncAt']),
      jumlahData: serializer.fromJson<int>(json['jumlahData']),
      keterangan: serializer.fromJson<String>(json['keterangan']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'key': serializer.toJson<String>(key),
      'lastSyncAt': serializer.toJson<String>(lastSyncAt),
      'jumlahData': serializer.toJson<int>(jumlahData),
      'keterangan': serializer.toJson<String>(keterangan),
    };
  }

  SyncInfo copyWith(
          {String? key,
          String? lastSyncAt,
          int? jumlahData,
          String? keterangan}) =>
      SyncInfo(
        key: key ?? this.key,
        lastSyncAt: lastSyncAt ?? this.lastSyncAt,
        jumlahData: jumlahData ?? this.jumlahData,
        keterangan: keterangan ?? this.keterangan,
      );
  SyncInfo copyWithCompanion(SyncInfosCompanion data) {
    return SyncInfo(
      key: data.key.present ? data.key.value : this.key,
      lastSyncAt:
          data.lastSyncAt.present ? data.lastSyncAt.value : this.lastSyncAt,
      jumlahData:
          data.jumlahData.present ? data.jumlahData.value : this.jumlahData,
      keterangan:
          data.keterangan.present ? data.keterangan.value : this.keterangan,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SyncInfo(')
          ..write('key: $key, ')
          ..write('lastSyncAt: $lastSyncAt, ')
          ..write('jumlahData: $jumlahData, ')
          ..write('keterangan: $keterangan')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(key, lastSyncAt, jumlahData, keterangan);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SyncInfo &&
          other.key == this.key &&
          other.lastSyncAt == this.lastSyncAt &&
          other.jumlahData == this.jumlahData &&
          other.keterangan == this.keterangan);
}

class SyncInfosCompanion extends UpdateCompanion<SyncInfo> {
  final Value<String> key;
  final Value<String> lastSyncAt;
  final Value<int> jumlahData;
  final Value<String> keterangan;
  final Value<int> rowid;
  const SyncInfosCompanion({
    this.key = const Value.absent(),
    this.lastSyncAt = const Value.absent(),
    this.jumlahData = const Value.absent(),
    this.keterangan = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SyncInfosCompanion.insert({
    required String key,
    this.lastSyncAt = const Value.absent(),
    this.jumlahData = const Value.absent(),
    this.keterangan = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : key = Value(key);
  static Insertable<SyncInfo> custom({
    Expression<String>? key,
    Expression<String>? lastSyncAt,
    Expression<int>? jumlahData,
    Expression<String>? keterangan,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (key != null) 'key': key,
      if (lastSyncAt != null) 'last_sync_at': lastSyncAt,
      if (jumlahData != null) 'jumlah_data': jumlahData,
      if (keterangan != null) 'keterangan': keterangan,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SyncInfosCompanion copyWith(
      {Value<String>? key,
      Value<String>? lastSyncAt,
      Value<int>? jumlahData,
      Value<String>? keterangan,
      Value<int>? rowid}) {
    return SyncInfosCompanion(
      key: key ?? this.key,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
      jumlahData: jumlahData ?? this.jumlahData,
      keterangan: keterangan ?? this.keterangan,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (lastSyncAt.present) {
      map['last_sync_at'] = Variable<String>(lastSyncAt.value);
    }
    if (jumlahData.present) {
      map['jumlah_data'] = Variable<int>(jumlahData.value);
    }
    if (keterangan.present) {
      map['keterangan'] = Variable<String>(keterangan.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncInfosCompanion(')
          ..write('key: $key, ')
          ..write('lastSyncAt: $lastSyncAt, ')
          ..write('jumlahData: $jumlahData, ')
          ..write('keterangan: $keterangan, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $GlobalHeadersTable globalHeaders = $GlobalHeadersTable(this);
  late final $MasterPenyulangsTable masterPenyulangs =
      $MasterPenyulangsTable(this);
  late final $LaporanHariansTable laporanHarians = $LaporanHariansTable(this);
  late final $SyncInfosTable syncInfos = $SyncInfosTable(this);
  late final Index idxGlobalHeaderTanggal = Index('idx_global_header_tanggal',
      'CREATE INDEX idx_global_header_tanggal ON global_header (tanggal)');
  late final Index idxGlobalHeaderTim = Index('idx_global_header_tim',
      'CREATE INDEX idx_global_header_tim ON global_header (tim)');
  late final Index idxGlobalHeaderSubTim = Index('idx_global_header_sub_tim',
      'CREATE INDEX idx_global_header_sub_tim ON global_header (sub_tim)');
  late final Index idxMasterPenyulangNama = Index('idx_master_penyulang_nama',
      'CREATE INDEX idx_master_penyulang_nama ON master_penyulang (nama_penyulang)');
  late final MasterDao masterDao = MasterDao(this as AppDatabase);
  late final LaporanDao laporanDao = LaporanDao(this as AppDatabase);
  late final SyncDao syncDao = SyncDao(this as AppDatabase);
  late final HeaderDao headerDao = HeaderDao(this as AppDatabase);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
        globalHeaders,
        masterPenyulangs,
        laporanHarians,
        syncInfos,
        idxGlobalHeaderTanggal,
        idxGlobalHeaderTim,
        idxGlobalHeaderSubTim,
        idxMasterPenyulangNama
      ];
}

typedef $$GlobalHeadersTableCreateCompanionBuilder = GlobalHeadersCompanion
    Function({
  Value<int?> no,
  required String kodeHeader,
  Value<String> ulp,
  Value<String> hari,
  Value<String> tanggal,
  Value<String> tim,
  Value<String> subTim,
  Value<String> koordinatAwal,
  Value<String> koordinatAkhir,
  Value<String> kmAwal,
  Value<String> kmAkhir,
  Value<String> kendala,
  Value<String> waText,
  Value<String> timestamp,
  Value<String> inputBy,
  Value<String> timestampUpdate,
  Value<String> statusTextWa,
  Value<int> rowid,
});
typedef $$GlobalHeadersTableUpdateCompanionBuilder = GlobalHeadersCompanion
    Function({
  Value<int?> no,
  Value<String> kodeHeader,
  Value<String> ulp,
  Value<String> hari,
  Value<String> tanggal,
  Value<String> tim,
  Value<String> subTim,
  Value<String> koordinatAwal,
  Value<String> koordinatAkhir,
  Value<String> kmAwal,
  Value<String> kmAkhir,
  Value<String> kendala,
  Value<String> waText,
  Value<String> timestamp,
  Value<String> inputBy,
  Value<String> timestampUpdate,
  Value<String> statusTextWa,
  Value<int> rowid,
});

class $$GlobalHeadersTableFilterComposer
    extends Composer<_$AppDatabase, $GlobalHeadersTable> {
  $$GlobalHeadersTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get no => $composableBuilder(
      column: $table.no, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kodeHeader => $composableBuilder(
      column: $table.kodeHeader, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get hari => $composableBuilder(
      column: $table.hari, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tanggal => $composableBuilder(
      column: $table.tanggal, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tim => $composableBuilder(
      column: $table.tim, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get subTim => $composableBuilder(
      column: $table.subTim, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get koordinatAwal => $composableBuilder(
      column: $table.koordinatAwal, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get koordinatAkhir => $composableBuilder(
      column: $table.koordinatAkhir,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kmAwal => $composableBuilder(
      column: $table.kmAwal, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kmAkhir => $composableBuilder(
      column: $table.kmAkhir, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kendala => $composableBuilder(
      column: $table.kendala, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get waText => $composableBuilder(
      column: $table.waText, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get timestamp => $composableBuilder(
      column: $table.timestamp, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get inputBy => $composableBuilder(
      column: $table.inputBy, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get timestampUpdate => $composableBuilder(
      column: $table.timestampUpdate,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get statusTextWa => $composableBuilder(
      column: $table.statusTextWa, builder: (column) => ColumnFilters(column));
}

class $$GlobalHeadersTableOrderingComposer
    extends Composer<_$AppDatabase, $GlobalHeadersTable> {
  $$GlobalHeadersTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get no => $composableBuilder(
      column: $table.no, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kodeHeader => $composableBuilder(
      column: $table.kodeHeader, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get hari => $composableBuilder(
      column: $table.hari, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tanggal => $composableBuilder(
      column: $table.tanggal, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tim => $composableBuilder(
      column: $table.tim, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get subTim => $composableBuilder(
      column: $table.subTim, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get koordinatAwal => $composableBuilder(
      column: $table.koordinatAwal,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get koordinatAkhir => $composableBuilder(
      column: $table.koordinatAkhir,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kmAwal => $composableBuilder(
      column: $table.kmAwal, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kmAkhir => $composableBuilder(
      column: $table.kmAkhir, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kendala => $composableBuilder(
      column: $table.kendala, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get waText => $composableBuilder(
      column: $table.waText, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get timestamp => $composableBuilder(
      column: $table.timestamp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get inputBy => $composableBuilder(
      column: $table.inputBy, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get timestampUpdate => $composableBuilder(
      column: $table.timestampUpdate,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get statusTextWa => $composableBuilder(
      column: $table.statusTextWa,
      builder: (column) => ColumnOrderings(column));
}

class $$GlobalHeadersTableAnnotationComposer
    extends Composer<_$AppDatabase, $GlobalHeadersTable> {
  $$GlobalHeadersTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get no =>
      $composableBuilder(column: $table.no, builder: (column) => column);

  GeneratedColumn<String> get kodeHeader => $composableBuilder(
      column: $table.kodeHeader, builder: (column) => column);

  GeneratedColumn<String> get ulp =>
      $composableBuilder(column: $table.ulp, builder: (column) => column);

  GeneratedColumn<String> get hari =>
      $composableBuilder(column: $table.hari, builder: (column) => column);

  GeneratedColumn<String> get tanggal =>
      $composableBuilder(column: $table.tanggal, builder: (column) => column);

  GeneratedColumn<String> get tim =>
      $composableBuilder(column: $table.tim, builder: (column) => column);

  GeneratedColumn<String> get subTim =>
      $composableBuilder(column: $table.subTim, builder: (column) => column);

  GeneratedColumn<String> get koordinatAwal => $composableBuilder(
      column: $table.koordinatAwal, builder: (column) => column);

  GeneratedColumn<String> get koordinatAkhir => $composableBuilder(
      column: $table.koordinatAkhir, builder: (column) => column);

  GeneratedColumn<String> get kmAwal =>
      $composableBuilder(column: $table.kmAwal, builder: (column) => column);

  GeneratedColumn<String> get kmAkhir =>
      $composableBuilder(column: $table.kmAkhir, builder: (column) => column);

  GeneratedColumn<String> get kendala =>
      $composableBuilder(column: $table.kendala, builder: (column) => column);

  GeneratedColumn<String> get waText =>
      $composableBuilder(column: $table.waText, builder: (column) => column);

  GeneratedColumn<String> get timestamp =>
      $composableBuilder(column: $table.timestamp, builder: (column) => column);

  GeneratedColumn<String> get inputBy =>
      $composableBuilder(column: $table.inputBy, builder: (column) => column);

  GeneratedColumn<String> get timestampUpdate => $composableBuilder(
      column: $table.timestampUpdate, builder: (column) => column);

  GeneratedColumn<String> get statusTextWa => $composableBuilder(
      column: $table.statusTextWa, builder: (column) => column);
}

class $$GlobalHeadersTableTableManager extends RootTableManager<
    _$AppDatabase,
    $GlobalHeadersTable,
    GlobalHeader,
    $$GlobalHeadersTableFilterComposer,
    $$GlobalHeadersTableOrderingComposer,
    $$GlobalHeadersTableAnnotationComposer,
    $$GlobalHeadersTableCreateCompanionBuilder,
    $$GlobalHeadersTableUpdateCompanionBuilder,
    (
      GlobalHeader,
      BaseReferences<_$AppDatabase, $GlobalHeadersTable, GlobalHeader>
    ),
    GlobalHeader,
    PrefetchHooks Function()> {
  $$GlobalHeadersTableTableManager(_$AppDatabase db, $GlobalHeadersTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$GlobalHeadersTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$GlobalHeadersTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$GlobalHeadersTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int?> no = const Value.absent(),
            Value<String> kodeHeader = const Value.absent(),
            Value<String> ulp = const Value.absent(),
            Value<String> hari = const Value.absent(),
            Value<String> tanggal = const Value.absent(),
            Value<String> tim = const Value.absent(),
            Value<String> subTim = const Value.absent(),
            Value<String> koordinatAwal = const Value.absent(),
            Value<String> koordinatAkhir = const Value.absent(),
            Value<String> kmAwal = const Value.absent(),
            Value<String> kmAkhir = const Value.absent(),
            Value<String> kendala = const Value.absent(),
            Value<String> waText = const Value.absent(),
            Value<String> timestamp = const Value.absent(),
            Value<String> inputBy = const Value.absent(),
            Value<String> timestampUpdate = const Value.absent(),
            Value<String> statusTextWa = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              GlobalHeadersCompanion(
            no: no,
            kodeHeader: kodeHeader,
            ulp: ulp,
            hari: hari,
            tanggal: tanggal,
            tim: tim,
            subTim: subTim,
            koordinatAwal: koordinatAwal,
            koordinatAkhir: koordinatAkhir,
            kmAwal: kmAwal,
            kmAkhir: kmAkhir,
            kendala: kendala,
            waText: waText,
            timestamp: timestamp,
            inputBy: inputBy,
            timestampUpdate: timestampUpdate,
            statusTextWa: statusTextWa,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            Value<int?> no = const Value.absent(),
            required String kodeHeader,
            Value<String> ulp = const Value.absent(),
            Value<String> hari = const Value.absent(),
            Value<String> tanggal = const Value.absent(),
            Value<String> tim = const Value.absent(),
            Value<String> subTim = const Value.absent(),
            Value<String> koordinatAwal = const Value.absent(),
            Value<String> koordinatAkhir = const Value.absent(),
            Value<String> kmAwal = const Value.absent(),
            Value<String> kmAkhir = const Value.absent(),
            Value<String> kendala = const Value.absent(),
            Value<String> waText = const Value.absent(),
            Value<String> timestamp = const Value.absent(),
            Value<String> inputBy = const Value.absent(),
            Value<String> timestampUpdate = const Value.absent(),
            Value<String> statusTextWa = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              GlobalHeadersCompanion.insert(
            no: no,
            kodeHeader: kodeHeader,
            ulp: ulp,
            hari: hari,
            tanggal: tanggal,
            tim: tim,
            subTim: subTim,
            koordinatAwal: koordinatAwal,
            koordinatAkhir: koordinatAkhir,
            kmAwal: kmAwal,
            kmAkhir: kmAkhir,
            kendala: kendala,
            waText: waText,
            timestamp: timestamp,
            inputBy: inputBy,
            timestampUpdate: timestampUpdate,
            statusTextWa: statusTextWa,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$GlobalHeadersTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $GlobalHeadersTable,
    GlobalHeader,
    $$GlobalHeadersTableFilterComposer,
    $$GlobalHeadersTableOrderingComposer,
    $$GlobalHeadersTableAnnotationComposer,
    $$GlobalHeadersTableCreateCompanionBuilder,
    $$GlobalHeadersTableUpdateCompanionBuilder,
    (
      GlobalHeader,
      BaseReferences<_$AppDatabase, $GlobalHeadersTable, GlobalHeader>
    ),
    GlobalHeader,
    PrefetchHooks Function()>;
typedef $$MasterPenyulangsTableCreateCompanionBuilder
    = MasterPenyulangsCompanion Function({
  Value<int> id,
  Value<int?> no,
  Value<String> ulp,
  Value<String> namaPenyulang,
  Value<String> namaSwitching,
  Value<String> section,
});
typedef $$MasterPenyulangsTableUpdateCompanionBuilder
    = MasterPenyulangsCompanion Function({
  Value<int> id,
  Value<int?> no,
  Value<String> ulp,
  Value<String> namaPenyulang,
  Value<String> namaSwitching,
  Value<String> section,
});

class $$MasterPenyulangsTableFilterComposer
    extends Composer<_$AppDatabase, $MasterPenyulangsTable> {
  $$MasterPenyulangsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get no => $composableBuilder(
      column: $table.no, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get namaPenyulang => $composableBuilder(
      column: $table.namaPenyulang, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get namaSwitching => $composableBuilder(
      column: $table.namaSwitching, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get section => $composableBuilder(
      column: $table.section, builder: (column) => ColumnFilters(column));
}

class $$MasterPenyulangsTableOrderingComposer
    extends Composer<_$AppDatabase, $MasterPenyulangsTable> {
  $$MasterPenyulangsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get no => $composableBuilder(
      column: $table.no, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get namaPenyulang => $composableBuilder(
      column: $table.namaPenyulang,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get namaSwitching => $composableBuilder(
      column: $table.namaSwitching,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get section => $composableBuilder(
      column: $table.section, builder: (column) => ColumnOrderings(column));
}

class $$MasterPenyulangsTableAnnotationComposer
    extends Composer<_$AppDatabase, $MasterPenyulangsTable> {
  $$MasterPenyulangsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<int> get no =>
      $composableBuilder(column: $table.no, builder: (column) => column);

  GeneratedColumn<String> get ulp =>
      $composableBuilder(column: $table.ulp, builder: (column) => column);

  GeneratedColumn<String> get namaPenyulang => $composableBuilder(
      column: $table.namaPenyulang, builder: (column) => column);

  GeneratedColumn<String> get namaSwitching => $composableBuilder(
      column: $table.namaSwitching, builder: (column) => column);

  GeneratedColumn<String> get section =>
      $composableBuilder(column: $table.section, builder: (column) => column);
}

class $$MasterPenyulangsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $MasterPenyulangsTable,
    MasterPenyulang,
    $$MasterPenyulangsTableFilterComposer,
    $$MasterPenyulangsTableOrderingComposer,
    $$MasterPenyulangsTableAnnotationComposer,
    $$MasterPenyulangsTableCreateCompanionBuilder,
    $$MasterPenyulangsTableUpdateCompanionBuilder,
    (
      MasterPenyulang,
      BaseReferences<_$AppDatabase, $MasterPenyulangsTable, MasterPenyulang>
    ),
    MasterPenyulang,
    PrefetchHooks Function()> {
  $$MasterPenyulangsTableTableManager(
      _$AppDatabase db, $MasterPenyulangsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$MasterPenyulangsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$MasterPenyulangsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$MasterPenyulangsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int?> no = const Value.absent(),
            Value<String> ulp = const Value.absent(),
            Value<String> namaPenyulang = const Value.absent(),
            Value<String> namaSwitching = const Value.absent(),
            Value<String> section = const Value.absent(),
          }) =>
              MasterPenyulangsCompanion(
            id: id,
            no: no,
            ulp: ulp,
            namaPenyulang: namaPenyulang,
            namaSwitching: namaSwitching,
            section: section,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int?> no = const Value.absent(),
            Value<String> ulp = const Value.absent(),
            Value<String> namaPenyulang = const Value.absent(),
            Value<String> namaSwitching = const Value.absent(),
            Value<String> section = const Value.absent(),
          }) =>
              MasterPenyulangsCompanion.insert(
            id: id,
            no: no,
            ulp: ulp,
            namaPenyulang: namaPenyulang,
            namaSwitching: namaSwitching,
            section: section,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$MasterPenyulangsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $MasterPenyulangsTable,
    MasterPenyulang,
    $$MasterPenyulangsTableFilterComposer,
    $$MasterPenyulangsTableOrderingComposer,
    $$MasterPenyulangsTableAnnotationComposer,
    $$MasterPenyulangsTableCreateCompanionBuilder,
    $$MasterPenyulangsTableUpdateCompanionBuilder,
    (
      MasterPenyulang,
      BaseReferences<_$AppDatabase, $MasterPenyulangsTable, MasterPenyulang>
    ),
    MasterPenyulang,
    PrefetchHooks Function()>;
typedef $$LaporanHariansTableCreateCompanionBuilder = LaporanHariansCompanion
    Function({
  Value<int?> no,
  required String tanggal,
  Value<String> penyulang,
  Value<String> panjangKms,
  Value<String> temuan,
  Value<String> eksekusi,
  Value<String> laporanUp3,
  Value<String> laporanUiw,
  Value<int> rowid,
});
typedef $$LaporanHariansTableUpdateCompanionBuilder = LaporanHariansCompanion
    Function({
  Value<int?> no,
  Value<String> tanggal,
  Value<String> penyulang,
  Value<String> panjangKms,
  Value<String> temuan,
  Value<String> eksekusi,
  Value<String> laporanUp3,
  Value<String> laporanUiw,
  Value<int> rowid,
});

class $$LaporanHariansTableFilterComposer
    extends Composer<_$AppDatabase, $LaporanHariansTable> {
  $$LaporanHariansTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get no => $composableBuilder(
      column: $table.no, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tanggal => $composableBuilder(
      column: $table.tanggal, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get penyulang => $composableBuilder(
      column: $table.penyulang, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get panjangKms => $composableBuilder(
      column: $table.panjangKms, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get temuan => $composableBuilder(
      column: $table.temuan, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get eksekusi => $composableBuilder(
      column: $table.eksekusi, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get laporanUp3 => $composableBuilder(
      column: $table.laporanUp3, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get laporanUiw => $composableBuilder(
      column: $table.laporanUiw, builder: (column) => ColumnFilters(column));
}

class $$LaporanHariansTableOrderingComposer
    extends Composer<_$AppDatabase, $LaporanHariansTable> {
  $$LaporanHariansTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get no => $composableBuilder(
      column: $table.no, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tanggal => $composableBuilder(
      column: $table.tanggal, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get penyulang => $composableBuilder(
      column: $table.penyulang, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get panjangKms => $composableBuilder(
      column: $table.panjangKms, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get temuan => $composableBuilder(
      column: $table.temuan, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get eksekusi => $composableBuilder(
      column: $table.eksekusi, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get laporanUp3 => $composableBuilder(
      column: $table.laporanUp3, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get laporanUiw => $composableBuilder(
      column: $table.laporanUiw, builder: (column) => ColumnOrderings(column));
}

class $$LaporanHariansTableAnnotationComposer
    extends Composer<_$AppDatabase, $LaporanHariansTable> {
  $$LaporanHariansTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get no =>
      $composableBuilder(column: $table.no, builder: (column) => column);

  GeneratedColumn<String> get tanggal =>
      $composableBuilder(column: $table.tanggal, builder: (column) => column);

  GeneratedColumn<String> get penyulang =>
      $composableBuilder(column: $table.penyulang, builder: (column) => column);

  GeneratedColumn<String> get panjangKms => $composableBuilder(
      column: $table.panjangKms, builder: (column) => column);

  GeneratedColumn<String> get temuan =>
      $composableBuilder(column: $table.temuan, builder: (column) => column);

  GeneratedColumn<String> get eksekusi =>
      $composableBuilder(column: $table.eksekusi, builder: (column) => column);

  GeneratedColumn<String> get laporanUp3 => $composableBuilder(
      column: $table.laporanUp3, builder: (column) => column);

  GeneratedColumn<String> get laporanUiw => $composableBuilder(
      column: $table.laporanUiw, builder: (column) => column);
}

class $$LaporanHariansTableTableManager extends RootTableManager<
    _$AppDatabase,
    $LaporanHariansTable,
    LaporanHarian,
    $$LaporanHariansTableFilterComposer,
    $$LaporanHariansTableOrderingComposer,
    $$LaporanHariansTableAnnotationComposer,
    $$LaporanHariansTableCreateCompanionBuilder,
    $$LaporanHariansTableUpdateCompanionBuilder,
    (
      LaporanHarian,
      BaseReferences<_$AppDatabase, $LaporanHariansTable, LaporanHarian>
    ),
    LaporanHarian,
    PrefetchHooks Function()> {
  $$LaporanHariansTableTableManager(
      _$AppDatabase db, $LaporanHariansTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LaporanHariansTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LaporanHariansTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LaporanHariansTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int?> no = const Value.absent(),
            Value<String> tanggal = const Value.absent(),
            Value<String> penyulang = const Value.absent(),
            Value<String> panjangKms = const Value.absent(),
            Value<String> temuan = const Value.absent(),
            Value<String> eksekusi = const Value.absent(),
            Value<String> laporanUp3 = const Value.absent(),
            Value<String> laporanUiw = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              LaporanHariansCompanion(
            no: no,
            tanggal: tanggal,
            penyulang: penyulang,
            panjangKms: panjangKms,
            temuan: temuan,
            eksekusi: eksekusi,
            laporanUp3: laporanUp3,
            laporanUiw: laporanUiw,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            Value<int?> no = const Value.absent(),
            required String tanggal,
            Value<String> penyulang = const Value.absent(),
            Value<String> panjangKms = const Value.absent(),
            Value<String> temuan = const Value.absent(),
            Value<String> eksekusi = const Value.absent(),
            Value<String> laporanUp3 = const Value.absent(),
            Value<String> laporanUiw = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              LaporanHariansCompanion.insert(
            no: no,
            tanggal: tanggal,
            penyulang: penyulang,
            panjangKms: panjangKms,
            temuan: temuan,
            eksekusi: eksekusi,
            laporanUp3: laporanUp3,
            laporanUiw: laporanUiw,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$LaporanHariansTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $LaporanHariansTable,
    LaporanHarian,
    $$LaporanHariansTableFilterComposer,
    $$LaporanHariansTableOrderingComposer,
    $$LaporanHariansTableAnnotationComposer,
    $$LaporanHariansTableCreateCompanionBuilder,
    $$LaporanHariansTableUpdateCompanionBuilder,
    (
      LaporanHarian,
      BaseReferences<_$AppDatabase, $LaporanHariansTable, LaporanHarian>
    ),
    LaporanHarian,
    PrefetchHooks Function()>;
typedef $$SyncInfosTableCreateCompanionBuilder = SyncInfosCompanion Function({
  required String key,
  Value<String> lastSyncAt,
  Value<int> jumlahData,
  Value<String> keterangan,
  Value<int> rowid,
});
typedef $$SyncInfosTableUpdateCompanionBuilder = SyncInfosCompanion Function({
  Value<String> key,
  Value<String> lastSyncAt,
  Value<int> jumlahData,
  Value<String> keterangan,
  Value<int> rowid,
});

class $$SyncInfosTableFilterComposer
    extends Composer<_$AppDatabase, $SyncInfosTable> {
  $$SyncInfosTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key => $composableBuilder(
      column: $table.key, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastSyncAt => $composableBuilder(
      column: $table.lastSyncAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get jumlahData => $composableBuilder(
      column: $table.jumlahData, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get keterangan => $composableBuilder(
      column: $table.keterangan, builder: (column) => ColumnFilters(column));
}

class $$SyncInfosTableOrderingComposer
    extends Composer<_$AppDatabase, $SyncInfosTable> {
  $$SyncInfosTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key => $composableBuilder(
      column: $table.key, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastSyncAt => $composableBuilder(
      column: $table.lastSyncAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get jumlahData => $composableBuilder(
      column: $table.jumlahData, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get keterangan => $composableBuilder(
      column: $table.keterangan, builder: (column) => ColumnOrderings(column));
}

class $$SyncInfosTableAnnotationComposer
    extends Composer<_$AppDatabase, $SyncInfosTable> {
  $$SyncInfosTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<String> get lastSyncAt => $composableBuilder(
      column: $table.lastSyncAt, builder: (column) => column);

  GeneratedColumn<int> get jumlahData => $composableBuilder(
      column: $table.jumlahData, builder: (column) => column);

  GeneratedColumn<String> get keterangan => $composableBuilder(
      column: $table.keterangan, builder: (column) => column);
}

class $$SyncInfosTableTableManager extends RootTableManager<
    _$AppDatabase,
    $SyncInfosTable,
    SyncInfo,
    $$SyncInfosTableFilterComposer,
    $$SyncInfosTableOrderingComposer,
    $$SyncInfosTableAnnotationComposer,
    $$SyncInfosTableCreateCompanionBuilder,
    $$SyncInfosTableUpdateCompanionBuilder,
    (SyncInfo, BaseReferences<_$AppDatabase, $SyncInfosTable, SyncInfo>),
    SyncInfo,
    PrefetchHooks Function()> {
  $$SyncInfosTableTableManager(_$AppDatabase db, $SyncInfosTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SyncInfosTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SyncInfosTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SyncInfosTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> key = const Value.absent(),
            Value<String> lastSyncAt = const Value.absent(),
            Value<int> jumlahData = const Value.absent(),
            Value<String> keterangan = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              SyncInfosCompanion(
            key: key,
            lastSyncAt: lastSyncAt,
            jumlahData: jumlahData,
            keterangan: keterangan,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String key,
            Value<String> lastSyncAt = const Value.absent(),
            Value<int> jumlahData = const Value.absent(),
            Value<String> keterangan = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              SyncInfosCompanion.insert(
            key: key,
            lastSyncAt: lastSyncAt,
            jumlahData: jumlahData,
            keterangan: keterangan,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$SyncInfosTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $SyncInfosTable,
    SyncInfo,
    $$SyncInfosTableFilterComposer,
    $$SyncInfosTableOrderingComposer,
    $$SyncInfosTableAnnotationComposer,
    $$SyncInfosTableCreateCompanionBuilder,
    $$SyncInfosTableUpdateCompanionBuilder,
    (SyncInfo, BaseReferences<_$AppDatabase, $SyncInfosTable, SyncInfo>),
    SyncInfo,
    PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$GlobalHeadersTableTableManager get globalHeaders =>
      $$GlobalHeadersTableTableManager(_db, _db.globalHeaders);
  $$MasterPenyulangsTableTableManager get masterPenyulangs =>
      $$MasterPenyulangsTableTableManager(_db, _db.masterPenyulangs);
  $$LaporanHariansTableTableManager get laporanHarians =>
      $$LaporanHariansTableTableManager(_db, _db.laporanHarians);
  $$SyncInfosTableTableManager get syncInfos =>
      $$SyncInfosTableTableManager(_db, _db.syncInfos);
}
